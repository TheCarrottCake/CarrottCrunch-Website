import {data, Form, Link, isRouteErrorResponse, useNavigation} from 'react-router';
import type {Route} from './+types/control-staff';
import {contentEnvironmentContext} from '../lib/cloudflare-context.server';
import {AuthError, staffCsrfToken} from '../lib/staff-auth.server';
import {managementSession, managementHeaders, StaffManagementError, staffRoster, staffAdminHistory, parseStaffChange, changeStaffAccess} from '../lib/staff-management.server';
import {ControlDashboard} from '../components/control-dashboard';
import {ControlShell} from '../components/control-shell';
export function headers(){return managementHeaders;}
export function meta(){return [{title:'Staff Management - CarrottCrunch'},{name:'robots',content:'noindex, nofollow'}];}
function failure(error:unknown){
  const status=error instanceof StaffManagementError?error.status:error instanceof AuthError&&['denied','csrf'].includes(error.code)?403:503;
  return new Response(status===403?'Staff Management access denied.':status===503?'Staff Management is unavailable. Try again later.':error instanceof StaffManagementError?error.message:'Request failed.',{status,headers:managementHeaders});
}
export async function loader({request,context}:Route.LoaderArgs){try{
  const env=context.get(contentEnvironmentContext),session=await managementSession(request,env,false,import.meta.env.DEV),owner=session.role==='Owner';
  return data({identity:{username:session.username,displayName:session.display_name},role:session.role,csrf:await staffCsrfToken(session,env),self:owner?session.discord_user_id:undefined,roster:await staffRoster(env,owner,Number(new URL(request.url).searchParams.get('offset')||0)),history:owner?await staffAdminHistory(env):[]},{headers:managementHeaders});
}catch(error){throw failure(error);}}
export async function action({request,context}:Route.ActionArgs){try{
  const env=context.get(contentEnvironmentContext),session=await managementSession(request,env,true,import.meta.env.DEV);
  const change=parseStaffChange(await request.formData());
  try{await changeStaffAccess(env,session,change);}catch(error){if(error instanceof StaffManagementError)return data({message:error.message,attempt:change,ok:false},{status:error.status,headers:managementHeaders});throw error;}
  return data({message:'Staff access updated. The affected person must sign in again. Their member account has not been deleted.',attempt:change,ok:true},{headers:managementHeaders});
}catch(error){throw failure(error);}}
const time=(stamp:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short'}).format(stamp);
const state=(value:string|null)=>{if(!value)return 'Not assigned';const v=JSON.parse(value) as {role:string;active:boolean};return `${v.role} / ${v.active?'Active':'Inactive'}`;};
export default function StaffManagement({loaderData:d,actionData:a}:Route.ComponentProps){
  const owner=d.role==='Owner',pending=useNavigation().state!=='idle';
  return <ControlDashboard {...d} section="Staff Management"><section className="studio-workspace staff-management" aria-busy={pending}>
    <h1>Staff Management</h1><p>{owner?'Manage private staff access. Public staff profiles are separate and are not published here.':'Read-only staff roster. Only the Owner can change staff roles or access.'}</p>
    {a&&<div className="content-notice" role="status"><p>{a.message}</p>{!a.ok&&<p>Your requested change: {a.attempt.role}, {a.attempt.active?'active':'inactive'}. Reload and review the latest roster before confirming again. Nothing is retried automatically.</p>}</div>}
    <h2>Staff roster</h2>
    {d.roster.items.map((person,index)=><article className="public-card staff-management-row" key={person.id||`${d.roster.offset}-${index}`}>
      <h3>{person.name}</h3>{person.username&&<p>@{person.username}</p>}<p><strong>{person.role}</strong> / {person.active?'Active':'Inactive'}</p>
      {owner&&person.id!==d.self?<Form method="post" key={`${person.id}-${person.version}-${a?.message||''}`}>
        <input type="hidden" name="_csrf" value={d.csrf}/><input type="hidden" name="intent" value="update"/><input type="hidden" name="target" value={person.id}/><input type="hidden" name="version" value={person.version}/>
        {person.role==='Owner'?<><input type="hidden" name="role" value="Moderator"/><p>Owner role is protected and cannot be changed here.</p></>:<label>Staff role<select name="role" defaultValue={person.role}><option>Moderator</option><option>Administrator</option></select></label>}
        <label>Staff access<select name="active" defaultValue={person.active?'1':'0'}><option value="1">Active</option><option value="0">Inactive</option></select></label>
        <label className="staff-management-confirm"><input type="checkbox" name="confirm" value="yes" required/><span>I confirm the selected access change for {person.name}. Existing sessions will end; their member account will remain.</span></label>
        <button className="button secondary" type="submit" disabled={pending}>Confirm access change</button>
      </Form>:owner&&<p>You cannot change your own access.</p>}
    </article>)}
    {!d.roster.items.length&&<p>No staff accounts on this page.</p>}
    <nav className="studio-actions" aria-label="Staff roster pages">{d.roster.offset>0&&<Link to={`?offset=${Math.max(0,d.roster.offset-25)}`}>Previous</Link>}{d.roster.more&&<Link to={`?offset=${d.roster.offset+25}`}>More staff</Link>}</nav>
    {owner&&<><section className="public-card"><h2>Assign staff access</h2><p>The person must already have signed in to this website with Discord. Use their exact Discord user ID; this page does not list or search member accounts. Owner status cannot be granted here.</p><Form method="post" key={`grant-${a?.message||''}`}>
      <input type="hidden" name="_csrf" value={d.csrf}/><input type="hidden" name="intent" value="grant"/><input type="hidden" name="version" value="0"/><input type="hidden" name="active" value="1"/>
      <label>Existing member's Discord user ID<input name="target" inputMode="numeric" pattern="[0-9]{17,20}" minLength={17} maxLength={20} required autoComplete="off" defaultValue={a&&!a.ok&&a.attempt.grant?a.attempt.target:''}/></label>
      <label>Staff role<select name="role" defaultValue={a&&!a.ok&&a.attempt.grant?a.attempt.role:'Moderator'}><option>Moderator</option><option>Administrator</option></select></label>
      <label className="staff-management-confirm"><input type="checkbox" name="confirm" value="yes" required/><span>I have verified the member ID and confirm granting the selected staff role.</span></label><button className="button primary" type="submit" disabled={pending}>Confirm staff assignment</button>
    </Form></section><section><h2>Staff administration history</h2><p>Latest 50 access changes. This private history does not contain community reports.</p>{d.history.map(item=><article className="public-card" key={item.id}><h3>{item.actor} / {item.operation==='grant'?'Assigned staff access':'Changed staff access'} / {item.target}</h3><p>{state(item.before)} to {state(item.after)}</p><p>{time(item.created_at)} (Toronto)</p></article>)}{!d.history.length&&<p>No staff administration changes recorded yet.</p>}</section></>}
  </section></ControlDashboard>;
}
export function ErrorBoundary({error}:Route.ErrorBoundaryProps){return <ControlShell title={isRouteErrorResponse(error)&&error.status===403?'Access denied.':'Staff Management unavailable.'}><p>Only authorized Administrators and Owners can view staff management. Try signing in again if your access changed.</p><Link to="/account">My Account</Link></ControlShell>;}
