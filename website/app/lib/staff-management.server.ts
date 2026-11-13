import {requireStaff, requireStaffAction, staffAuthHeaders, type AuthEnvironment, type StaffSession, type StaffRole} from './staff-auth.server.ts';
export const managementHeaders = {...staffAuthHeaders, 'Cache-Control':'private, no-store', Vary:'Cookie'};
export class StaffManagementError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {super(message);this.status=status;}
}
export type StaffChange = {target: string; version: number; role: 'Moderator' | 'Administrator'; active: boolean; grant: boolean};
const idPattern = /^[0-9]{17,20}$/;
export async function managementSession(request: Request, env: AuthEnvironment, write = false, development = false) {
  if (write && request.method !== 'POST') throw new StaffManagementError('Method not allowed.',405);
  return write ? requireStaffAction(request,env,'Owner',development) : requireStaff(request,env,'Administrator',development);
}
export function parseStaffChange(form: FormData): StaffChange {
  for (const key of ['target','version','role','active','intent','confirm']) if (form.getAll(key).length !== 1) throw new StaffManagementError('Review and confirm each requested change.');
  const target=String(form.get('target')),role=String(form.get('role')),active=String(form.get('active')),intent=String(form.get('intent')),revision=String(form.get('version'));
  if (!idPattern.test(target) || !['Moderator','Administrator'].includes(role) || !['0','1'].includes(active) || !['grant','update'].includes(intent) || !/^(0|[1-9][0-9]*)$/.test(revision) || form.get('confirm')!=='yes') throw new StaffManagementError('Review and explicitly confirm a valid staff access change.');
  const version=Number(revision);
  if (!Number.isSafeInteger(version) || (intent==='grant' ? version!==0 || active!=='1' : version<1)) throw new StaffManagementError('Reload the roster before changing access.');
  return {target,version,role:role as StaffChange['role'],active:active==='1',grant:intent==='grant'};
}
export async function staffRoster(env: AuthEnvironment, owner: boolean, offset = 0) {
  if (!Number.isSafeInteger(offset)||offset<0||offset>100000) throw new StaffManagementError('Invalid roster page.');
  const rows=(await env.CONTENT_DB!.prepare(`SELECT a.discord_user_id,a.role,a.active,a.access_version,COALESCE(NULLIF(u.display_name,''),u.username,'Staff account') display_name,u.username
    FROM staff_accounts a LEFT JOIN site_users u ON u.discord_user_id=a.discord_user_id ORDER BY a.created_at,a.discord_user_id LIMIT 26 OFFSET ?`).bind(offset).all<{discord_user_id:string;role:StaffRole;active:number;access_version:number;display_name:string;username:string|null}>()).results;
  return {more:rows.length>25,offset,items:rows.slice(0,25).map(r=>({name:r.display_name,username:r.username,role:r.role,active:!!r.active,...(owner?{id:r.discord_user_id,version:r.access_version}:{})}))};
}
export async function staffAdminHistory(env: AuthEnvironment) {
  return (await env.CONTENT_DB!.prepare(`SELECT a.id,a.created_at,COALESCE(NULLIF(actor.display_name,''),actor.username,'Staff account') actor,
    COALESCE(NULLIF(target.display_name,''),target.username,'Staff account') target,
    json_extract(a.details_json,'$.operation') operation,json_extract(a.details_json,'$.before') before,json_extract(a.details_json,'$.after') after
    FROM audit_records a LEFT JOIN site_users actor ON actor.discord_user_id=a.actor_id
    LEFT JOIN site_users target ON target.discord_user_id=json_extract(a.details_json,'$.target')
    WHERE json_extract(a.details_json,'$.entity')='staff-administration' ORDER BY a.created_at DESC,a.id DESC LIMIT 50`).all<{id:string;created_at:number;actor:string;target:string;operation:string;before:string|null;after:string}>()).results;
}
/** Batch writes and audit are atomic. Every write rechecks the live actor session and role. */
export async function changeStaffAccess(env: AuthEnvironment, actor: StaffSession, change: StaffChange) {
  if (actor.role!=='Owner') throw new StaffManagementError('Only the Owner may change staff access.',403);
  if (!idPattern.test(change.target)||!['Moderator','Administrator'].includes(change.role)||!Number.isSafeInteger(change.version)||change.version<0||typeof change.active!=='boolean'||typeof change.grant!=='boolean'||(change.grant?(change.version!==0||!change.active):change.version<1)) throw new StaffManagementError('Invalid staff access change.');
  if (actor.discord_user_id===change.target) throw new StaffManagementError('You cannot change your own staff access.');
  const db=env.CONTENT_DB!,now=Date.now();
  const current=await db.prepare('SELECT role,active,access_version FROM staff_accounts WHERE discord_user_id=?').bind(change.target).first<{role:StaffRole;active:number;access_version:number}>();
  if (change.grant ? !!current : !current||current.access_version!==change.version) throw new StaffManagementError('The roster changed. Reload and review the latest access before trying again.',409);
  if (current && current.role===change.role && !!current.active===change.active) throw new StaffManagementError('No access change was selected.');
  // Owner status cannot be assigned or removed here; only an existing Owner's active flag may change.
  const desiredRole=current?.role==='Owner'?'Owner':change.role;
  if (current?.role==='Owner' && change.role!=='Moderator') throw new StaffManagementError('Owner roles cannot be changed here.');
  const actorGuard=`EXISTS(SELECT 1 FROM staff_accounts actor JOIN site_sessions session ON session.discord_user_id=actor.discord_user_id WHERE actor.discord_user_id=? AND actor.active=1 AND actor.role='Owner' AND session.token_hash=? AND session.revoked_at IS NULL AND session.expires_at>?)`;
  const write=change.grant
    ? db.prepare(`INSERT INTO staff_accounts(discord_user_id,role,active,created_at,updated_at) SELECT ?,?,1,?,? WHERE EXISTS(SELECT 1 FROM site_users WHERE discord_user_id=?) AND ${actorGuard} ON CONFLICT(discord_user_id) DO NOTHING`).bind(change.target,change.role,now,now,change.target,actor.discord_user_id,actor.token_hash,now)
    : db.prepare(`UPDATE staff_accounts SET role=?,active=?,updated_at=? WHERE discord_user_id=? AND access_version=? AND role=? AND active=? AND ${actorGuard} AND NOT(role='Owner' AND active=1 AND ?=0 AND (SELECT COUNT(*) FROM staff_accounts WHERE role='Owner' AND active=1)<=1)`).bind(desiredRole,Number(change.active),now,change.target,change.version,current!.role,current!.active,actor.discord_user_id,actor.token_hash,now,Number(change.active));
  const auditId=crypto.randomUUID();
  const details=JSON.stringify({entity:'staff-administration',operation:change.grant?'grant':'update',target:change.target,before:current?{role:current.role,active:!!current.active,version:current.access_version}:null,after:{role:desiredRole,active:change.active,version:change.grant?1:change.version+1}});
  const results=await db.batch([write,
    db.prepare(`INSERT INTO audit_records(id,actor_id,action,details_json,created_at) SELECT ?,?,'state_changed',?,? WHERE changes()=1`).bind(auditId,actor.discord_user_id,details,now),
    // Existing updates invalidate sessions via the 0005 trigger; initial grants must do so explicitly.
    db.prepare(`DELETE FROM site_sessions WHERE discord_user_id=? AND EXISTS(SELECT 1 FROM audit_records WHERE id=?)`).bind(change.target,auditId),
  ]);
  if (results[1].meta.changes!==1) throw new StaffManagementError('Access changed or could not be changed safely. Reload the roster and sign in again if needed. The last active Owner must remain enabled; new staff must already have signed in as a member.',409);
}
