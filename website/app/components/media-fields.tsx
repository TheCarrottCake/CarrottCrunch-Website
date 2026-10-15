import type { MediaAsset, MediaPermission } from '../lib/media-db.server';
const labels = {gallery:'Community gallery',homepage:'Homepage',external:'External promotion'};
export function MediaFields({asset}: {asset?:MediaAsset}) {
  return <div className="media-fields">
    <label>Title <input name="title" required maxLength={160} defaultValue={asset?.title}/></label>
    <label>Description <textarea name="description" maxLength={4000} defaultValue={asset?.description}/></label>
    <label>Accessibility alt text <textarea name="alt_text" maxLength={1000} defaultValue={asset?.alt_text}/></label>
    <label>Creator name <input name="creator_name" maxLength={160} defaultValue={asset?.creator_name}/></label>
    <label className="media-checkbox"><input name="anonymous" type="checkbox" defaultChecked={asset?.anonymous===1}/> Creator has permitted anonymous attribution</label>
    <label>Source URL (HTTPS) <input name="source_url" type="url" maxLength={2048} defaultValue={asset?.source_url}/></label>
    <label>Provenance and source information <textarea name="provenance" maxLength={4000} defaultValue={asset?.provenance}/></label>
  </div>;
}
export function PermissionFields({permissions}: {permissions:MediaPermission[]}) {
  return <div className="media-permissions">{(['gallery','homepage','external'] as const).map(purpose=>{
    const current=permissions.find(value=>value.purpose===purpose);
    return <fieldset key={purpose}><legend>{labels[purpose]}</legend>
      <label>Permission <select name={`${purpose}_status`} defaultValue={current?.status||'pending'}><option value="pending">Not approved</option><option value="approved">Explicitly approved</option><option value="rejected">Rejected</option><option value="revoked">Revoked</option></select></label>
      <label>Rights holder <input name={`${purpose}_rights_holder`} maxLength={160} defaultValue={current?.rights_holder}/></label>
      <label>Approval evidence / verifiable reference <textarea name={`${purpose}_evidence`} maxLength={2000} defaultValue={current?.evidence}/></label>
      <label>Conditions (require review before publication) <textarea name={`${purpose}_conditions`} maxLength={2000} defaultValue={current?.conditions}/></label>
      <label>Expires at start of date (UTC, optional) <input type="date" name={`${purpose}_expires_at`} defaultValue={current?.expires_at?new Date(current.expires_at).toISOString().slice(0,10):''}/></label>
    </fieldset>;
  })}</div>;
}
