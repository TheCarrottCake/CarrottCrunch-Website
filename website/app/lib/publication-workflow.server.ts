import { assertRevisionMedia } from './editorial-media.server.ts';
import { redirect } from 'react-router';
import { requireStaffAction, type AuthEnvironment, type StaffRole } from './staff-auth.server.ts';
import { StudioError, studioFailure, studioHeaders } from './content-studio.server.ts';
import { resolveEventTime, EVENT_TIMEZONE } from './event-time.ts';

export type WorkflowStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived';
export type Workflow = { content_id: string; editorial_revision: number; status: WorkflowStatus; version: number;
 submission_id: string | null; approval_id: string | null; pending_release_id: string | null; live_release_id: string | null; live_at: number | null };
type SingleWorkflowIntent = 'submit' | 'approve' | 'reject' | 'publish' | 'schedule' | 'cancel-schedule' | 'unpublish' | 'archive';
export type WorkflowIntent = SingleWorkflowIntent | 'approve-publish' | 'approve-schedule';
type Actor = { id: string; name: string; role: StaffRole };
export const workflowIntents: WorkflowIntent[] = ['submit','approve','reject','publish','schedule','cancel-schedule','unpublish','archive','approve-publish','approve-schedule'];

async function validateEditorialRevision(db:D1Database,id:string,revision:number) {
 const row=await db.prepare('SELECT r.snapshot_json,c.kind FROM content_revisions r JOIN content_items c ON c.id=r.content_id WHERE r.content_id=? AND r.revision=?').bind(id,revision).first<{snapshot_json:string;kind:string}>();
 if(!row)throw new StudioError('Saved revision not found.',409);
 const s=JSON.parse(row.snapshot_json);
 if(s.id!==id||s.kind!==row.kind||!['announcement','event'].includes(s.kind))throw new StudioError('The saved revision does not match this content.',409);
 if(typeof s.title!=='string'||!s.title.trim()||s.title.length>160||typeof s.body_text!=='string'||!s.body_text.trim()||s.body_text.length>40000)throw new StudioError('Save a valid title and body before submitting this revision.');
 if(s.kind==='announcement' && (typeof s.summary!=='string'||!s.summary.trim()||s.summary.length>600))throw new StudioError('Save an announcement summary before submitting this revision.');
 if(s.kind==='event'){
 if(!Number.isSafeInteger(s.starts_at)||s.starts_at<0||!Number.isSafeInteger(s.ends_at)||s.ends_at<=s.starts_at||typeof s.timezone!=='string'||/^[+-]/.test(s.timezone)||!['active','cancelled'].includes(s.event_state))throw new StudioError('Save valid event timing before submitting this revision.');
 try{new Intl.DateTimeFormat('en',{timeZone:s.timezone}).format();}catch{throw new StudioError('Save a valid event timezone before submitting this revision.');}
 }
}

export async function getWorkflow(db: D1Database, id: string): Promise<Workflow> {
 const row = await db.prepare('SELECT * FROM content_workflows WHERE content_id=?').bind(id).first<Workflow>();
 if (!row) throw new StudioError('Content workflow not found.',404);
 return row;
}

/** Private presentation metadata; callers must first require a staff session. */
export async function workflowPresentation(db: D1Database, workflow: Workflow) {
 const live = workflow.live_release_id ? await db.prepare('SELECT revision FROM content_releases WHERE id=? AND content_id=?').bind(workflow.live_release_id,workflow.content_id).first<{revision:number}>() : null;
 const pending = workflow.pending_release_id ? await db.prepare('SELECT due_at FROM content_releases WHERE id=? AND content_id=?').bind(workflow.pending_release_id,workflow.content_id).first<{due_at:number}>() : null;
 const approval = workflow.approval_id ? await db.prepare("SELECT actor_name,created_at FROM content_reviews WHERE id=? AND content_id=? AND revision=? AND action='approved'").bind(workflow.approval_id,workflow.content_id,workflow.editorial_revision).first<{actor_name:string;created_at:number}>() : null;
 return { liveRevision:live?.revision ?? null, scheduledAt:pending?.due_at ?? null,
   approvedBy:approval?.actor_name ?? null, approvedAt:approval?.created_at ?? null };
}
export async function workflowHistory(db: D1Database, id: string) {
 const labels:Record<string,string>={submit:'Submitted for review',approve:'Approved',reject:'Returned for revision',publish:'Published',schedule:'Publication scheduled','cancel-schedule':'Schedule cancelled',unpublish:'Unpublished',archive:'Archived','scheduled-publication':'Scheduled publication completed',draft_deleted:'Draft deleted'};
 const result = await db.prepare(`SELECT a.action,a.details_json,a.created_at,COALESCE(NULLIF(u.display_name,''),u.username) AS name FROM audit_records a LEFT JOIN site_users u ON u.discord_user_id=a.actor_id
 WHERE a.content_id=? AND (a.action='state_changed' OR (a.action='updated' AND (json_extract(a.details_json,'$.invalidatedApproval') IS NOT NULL OR json_extract(a.details_json,'$.cancelledRelease') IS NOT NULL))) ORDER BY a.created_at DESC,a.rowid DESC LIMIT 30`).bind(id).all<{name:string|null;action:string;details_json:string;created_at:number}>();
 return result.results.map(r => { const d=JSON.parse(r.details_json); return { name: String(d.actorName || r.name || 'Staff member'), action: labels[d.intent || d.reason] || (r.action==='updated'?'Edited — fresh approval required':'State changed'), revision: d.revision as number | undefined, explanation: String(d.explanation || ''), at:r.created_at }; });
}
export async function workflowCounts(db: D1Database, now=Date.now()) {
 return await db.prepare(`SELECT SUM(status='review') AS pending,SUM(status='scheduled' AND EXISTS(
 SELECT 1 FROM content_releases l WHERE l.id=w.pending_release_id AND l.due_at<=?)) AS overdue FROM content_workflows w`).bind(now).first<{pending:number|null;overdue:number|null}>();
}
export function publicationInstant(date: string,time: string,occurrence: string,now=Date.now()) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:(00|15|30|45)$/.test(time)) throw new StudioError('Choose a publication date and a time from the 15-minute options.');
 let instant: number;
 try { instant=resolveEventTime(`${date}T${time}`,EVENT_TIMEZONE,occurrence); }
 catch(error) { throw new StudioError((error as Error).message); }
 if (instant<=now) throw new StudioError('Choose a publication time in the future.');
 return instant;
}
/** All roles are checked again within the mutation transaction, including Cron authorizers. */
async function workflowTransition(db:D1Database,id:string,intent:SingleWorkflowIntent,revision:number,version:number,actor:Actor,options:{explanation?:string;dueAt?:number},now:number,current?:Workflow) {
 if (!workflowIntents.includes(intent) || !Number.isSafeInteger(revision) || revision<1 || !Number.isSafeInteger(version) || version<1) throw new StudioError('Reload this content before trying again.');
 const admin=intent!=='submit';
 if (admin && !['Administrator','Owner'].includes(actor.role)) throw new StudioError('Administrator or Owner permission is required.',403);
 const w=current ?? await getWorkflow(db,id);
 if(w.version!==version || w.editorial_revision!==revision) throw new StudioError('This content changed. Reload its workflow before trying again.',409);
 const explanation=options.explanation||'';
 if(explanation.length>2000) throw new StudioError('Keep the explanation within 2,000 characters.');
 const allowed:Record<SingleWorkflowIntent,WorkflowStatus[]>={submit:['draft'],approve:['review'],reject:['review'],publish:['approved'],schedule:['approved'], 'cancel-schedule':['scheduled'],unpublish:['draft','review','approved','scheduled','published'],archive:['draft','review','approved','scheduled','published']};
 if(!allowed[intent].includes(w.status) || (intent==='unpublish' && !w.live_release_id)) throw new StudioError('This action is no longer available. Reload the workflow.',409);
 if(['submit','approve','publish','schedule'].includes(intent))await validateEditorialRevision(db,id,revision);
 if(intent==='schedule' && (!Number.isSafeInteger(options.dueAt) || options.dueAt!<=now)) throw new StudioError('Choose a publication time in the future.');
 const reviewId=['submit','approve','reject'].includes(intent)?crypto.randomUUID():null;
 const releaseId=['publish','schedule'].includes(intent)?crypto.randomUUID():null;
 const status:WorkflowStatus=intent==='submit'?'review':intent==='approve'?'approved':intent==='publish'?'published':intent==='schedule'?'scheduled':intent==='cancel-schedule'?'approved':intent==='archive'?'archived':'draft';
 const submission=intent==='submit'?reviewId:['reject','unpublish','archive'].includes(intent)?null:w.submission_id;
 const approval=intent==='approve'?reviewId:['reject','unpublish','archive'].includes(intent)?null:w.approval_id;
 const live=intent==='publish'?releaseId:['unpublish','archive'].includes(intent)?null:w.live_release_id;
 const liveAt=intent==='publish'?now:live?w.live_at:null;
 const dueAt=intent==='schedule'?options.dueAt!:now;
 const details=JSON.stringify({intent,from:w.status,to:status,revision,actorName:actor.name,actorRole:actor.role,explanation,reviewId,releaseId,dueAt:releaseId?dueAt:undefined});
 const statements=[db.prepare(`UPDATE content_workflows SET status=?,version=version+1,submission_id=?,approval_id=?,pending_release_id=?,live_release_id=?,live_at=?
 WHERE content_id=? AND version=? AND editorial_revision=? AND status=?
 AND EXISTS(SELECT 1 FROM staff_accounts WHERE discord_user_id=? AND active=1 AND role IN (${admin?"'Administrator','Owner'":"'Moderator','Administrator','Owner'"}))
 AND EXISTS(SELECT 1 FROM content_items WHERE id=? AND is_fixture=0 AND state='draft' AND published_at IS NULL)`)
 .bind(status,submission,approval,intent==='schedule'?releaseId:null,live,liveAt,id,version,revision,w.status,actor.id,id),
 db.prepare(`INSERT INTO audit_records(id,content_id,actor_id,action,details_json,created_at) VALUES(?,?,?,'state_changed',CASE WHEN changes()=1 THEN ? ELSE NULL END,?)`).bind(crypto.randomUUID(),id,actor.id,details,now)];
 if(reviewId) statements.push(db.prepare(`INSERT INTO content_reviews(id,content_id,revision,action,submission_id,actor_id,actor_name,actor_role,explanation,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
 .bind(reviewId,id,revision,intent==='submit'?'submitted':intent==='approve'?'approved':'rejected',intent==='submit'?null:w.submission_id,actor.id,actor.name,actor.role,explanation,now));
 if(releaseId) statements.push(db.prepare(`INSERT INTO content_releases(id,content_id,revision,approval_id,actor_id,actor_name,actor_role,due_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
 .bind(releaseId,id,revision,w.approval_id,actor.id,actor.name,actor.role,dueAt,now));
 if(intent==='archive') statements.push(db.prepare("UPDATE content_items SET state='archived',updated_at=MAX(updated_at,?) WHERE id=?").bind(now,id));
 return { statements, next: { ...w, status, version:version+1, submission_id:submission, approval_id:approval, pending_release_id:intent==='schedule'?releaseId:null, live_release_id:live, live_at:liveAt } satisfies Workflow };
}

/** Compose real submission/approval/release transitions into ONE atomic D1 batch. */
export async function changeWorkflow(db:D1Database,id:string,intent:WorkflowIntent,revision:number,version:number,actor:Actor,options:{explanation?:string;dueAt?:number}={},now=Date.now(),bucket?:R2Bucket) {
 if(!workflowIntents.includes(intent))throw new StudioError('Use the supplied workflow controls.');
 let steps:SingleWorkflowIntent[];
 let current:Workflow|undefined;
 if(intent==='approve-publish'||intent==='approve-schedule') {
  if(!['Administrator','Owner'].includes(actor.role))throw new StudioError('Administrator or Owner permission is required.',403);
  current=await getWorkflow(db,id);
  if(current.version!==version||current.editorial_revision!==revision)throw new StudioError('This content changed. Reload its workflow before trying again.',409);
  if(!['draft','review','approved'].includes(current.status))throw new StudioError('Save a new working revision or cancel the existing schedule before publishing.',409);
  steps=[...(current.status==='draft'?['submit' as const]:[]),...(current.status!=='approved'?['approve' as const]:[]),intent==='approve-publish'?'publish':'schedule'];
 } else steps=[intent];
 if(steps.some(step=>['submit','approve','publish','schedule'].includes(step)))await assertRevisionMedia(db,bucket,id,revision,now,options.dueAt,steps.every(step=>step==='submit'));
 const statements:D1PreparedStatement[]=[];
 for(const step of steps) {
  const transition=await workflowTransition(db,id,step,revision,current?.version??version,actor,options,now,current);
  statements.push(...transition.statements);current=transition.next;
 }
 await db.batch(statements).catch(()=>{throw new StudioError('This content changed or the action could not be completed. Reload its workflow.',409);});
}

export async function sweepPublications(db:D1Database,now=Date.now(),bucket?:R2Bucket) {
 const due=await db.prepare(`SELECT l.id,l.content_id,l.actor_id,l.actor_name,l.revision FROM content_releases l JOIN content_workflows w ON w.pending_release_id=l.id
 WHERE w.status='scheduled' AND l.due_at<=? AND w.editorial_revision=l.revision AND w.approval_id=l.approval_id
 AND EXISTS(SELECT 1 FROM staff_accounts a WHERE a.discord_user_id=l.actor_id AND a.active=1 AND a.role IN('Administrator','Owner'))
 ORDER BY l.due_at,l.id LIMIT 50`).bind(now).all<{id:string;content_id:string;actor_id:string;actor_name:string;revision:number}>();
 let published=0,failed=0;
 for(const l of due.results) {
 try {
 await assertRevisionMedia(db,bucket,l.content_id,l.revision,now);
 const results=await db.batch([
 db.prepare(`UPDATE content_workflows SET live_release_id=?,live_at=?,pending_release_id=NULL,status='published',version=version+1
 WHERE content_id=? AND pending_release_id=? AND status='scheduled' AND editorial_revision=?
 AND EXISTS(SELECT 1 FROM content_reviews a JOIN content_releases r ON r.approval_id=a.id WHERE r.id=? AND a.action='approved' AND a.revision=content_workflows.editorial_revision AND a.id=content_workflows.approval_id AND r.due_at<=?)
 AND EXISTS(SELECT 1 FROM staff_accounts WHERE discord_user_id=? AND active=1 AND role IN('Administrator','Owner'))
 AND EXISTS(SELECT 1 FROM content_items WHERE id=? AND state='draft' AND published_at IS NULL AND is_fixture=0)`)
 .bind(l.id,now,l.content_id,l.id,l.revision,l.id,now,l.actor_id,l.content_id),
 db.prepare(`INSERT INTO audit_records(id,content_id,actor_id,action,details_json,created_at)
 SELECT ?,?,?,'state_changed',?,? WHERE changes()=1`).bind(crypto.randomUUID(),l.content_id,l.actor_id,JSON.stringify({intent:'scheduled-publication',revision:l.revision,releaseId:l.id,actorName:l.actor_name,executor:'cron'}),now)
 ]);
 published+=results[0].meta.changes;
 } catch { failed++; }
 }
 return {checked:due.results.length,published,failed};
}

export async function workflowAction(request:Request,env:AuthEnvironment,id:string,development=false) {
 try {
 if(request.method!=='POST') throw new StudioError('Method not allowed.',405);
 const session=await requireStaffAction(request,env,'Moderator',development);
 if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))throw new StudioError('Use the supplied workflow form.');
 if(!env.CONTENT_DB) throw new StudioError('Content database unavailable.',503);
 // Auth already bounds form decoding at 256 KiB; impose a smaller workflow limit too.
 const reader=request.body?.getReader(); if(!reader) throw new StudioError('Use the supplied workflow form.');
 let text='',length=0;const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>16384){void reader.cancel();throw new StudioError('Workflow form is too large.',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
 const f=new URLSearchParams(text);const intent=f.get('intent') as WorkflowIntent;
 if(['intent','revision','version'].some(k=>f.getAll(k).length!==1)||!workflowIntents.includes(intent)||['revision','version'].some(k=>!/^\d+$/.test(f.get(k)||''))) throw new StudioError('Use the supplied workflow controls.');
 for(const k of ['explanation','date','time','occurrence','returnTo']) if(f.getAll(k).length>1)throw new StudioError('Supply each field once.');
 if(f.has('returnTo')&&f.get('returnTo')!=='editor')throw new StudioError('Use the supplied workflow controls.');
 const dueAt=(intent==='schedule'||intent==='approve-schedule')?publicationInstant(f.get('date')||'',f.get('time')||'',f.get('occurrence')||''):undefined;
 await changeWorkflow(env.CONTENT_DB,id,intent,Number(f.get('revision')),Number(f.get('version')),{id:session.discord_user_id,name:session.display_name||session.username,role:session.role},{explanation:f.get('explanation')||'',dueAt},Date.now(),env.MEDIA_BUCKET);
 let destination=`/control/workflow/${id}?done=1`;
 if(f.get('returnTo')==='editor') {
  const content=await env.CONTENT_DB.prepare('SELECT kind FROM content_items WHERE id=?').bind(id).first<{kind:string}>();
  destination=intent==='archive'?`/control/news?kind=${content?.kind==='event'?'event':'announcement'}&archived=1`:`/control/${content?.kind==='event'?'events':'news'}/${id}?updated=1`;
 }
 return redirect(destination,{status:303,headers:studioHeaders});
 }catch(error){const failure=studioFailure(error);return Response.json({message:await failure.text(),status:failure.status},{status:failure.status,headers:studioHeaders});}
}
