import {Form} from 'react-router';
import type {EditorialGrant} from '../lib/editorial-media.server';
export function EditorialPermission({grant,csrf,canApprove}:{grant:EditorialGrant|null;csrf:string;canApprove:boolean}){
 return <section className="public-card"><h2>Editorial-use permission</h2>
 <p>For announcements, events, associated cards and same-site homepage teasers. Gallery and external promotion require their own permissions.</p>
 <p>Current decision: <strong>{grant?.status||'Not approved'}</strong>. Approval requires verifiable creator permission or licensing evidence; staff approval alone does not establish those rights.</p>
 {canApprove?<Form method="post" className="studio-form" key={grant?.id||'new-consent'} onSubmit={event=>{
  if(new FormData(event.currentTarget).get('editorial_status')==='revoked'&&!window.confirm('Revoke editorial permission? Images using this consent will stop being publicly delivered. Published text remains visible.'))event.preventDefault();
 }}>
  <input type="hidden" name="_csrf" value={csrf}/><input type="hidden" name="intent" value="editorial-consent"/><input type="hidden" name="editorial_previous" value={grant?.id||''}/>
  <label>Decision<select name="editorial_status" defaultValue={grant?.status||'pending'}><option value="pending">Not approved</option><option value="approved">Approve verified editorial use</option><option value="rejected">Rejected</option><option value="revoked">Revoke editorial use</option></select></label>
  <label>Rights holder<input name="editorial_holder" maxLength={160} defaultValue={grant?.rights_holder||''}/></label>
  <label>Creator permission / licensing evidence<textarea name="editorial_evidence" maxLength={2000} defaultValue={grant?.evidence||''}/></label>
  <label>Unresolved conditions<textarea name="editorial_conditions" maxLength={2000} defaultValue={grant?.conditions||''}/></label><p className="muted">Resolve conditions before approval. Changing this decision supersedes its consent: existing images using it stop being delivered. Reselect the image and authorize a new content release to restore delivery. Saving an unchanged decision leaves releases as they are.</p>
  <label>Permission expires at start of date (UTC, optional)<input type="date" name="editorial_expiry" defaultValue={grant?.expires_at?new Date(grant.expires_at).toISOString().slice(0,10):''}/></label>
  <button className="button primary">Save editorial decision</button>
 </Form>:<p className="muted">Only Administrators and Owners can approve editorial-use permissions. Moderators can select eligible images in content editors.</p>}
 </section>;
}
