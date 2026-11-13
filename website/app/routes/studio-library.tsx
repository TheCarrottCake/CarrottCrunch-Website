import {StudioItemDialog} from '../components/studio-item-dialog';
import {StudioIcon} from '../components/studio-actions';
import { data } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { Route } from './+types/studio-library';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioSession, studioIdentity, studioHeaders, studioFailure } from '../lib/content-studio.server';
import { ControlDashboard } from '../components/control-dashboard';
import { StudioUpload } from '../components/studio-media-picker';
type Asset = {
    id: string;
    title: string;
    description: string;
    tags: string;
    internal_notes: string;
    alt_text: string;
    creator_name: string;
    source_url: string;
    required_credit: string;
    publication_blocked: number;
    rights_expires_at: number | null;
    version: number;
    width: number;
    height: number;
    usage_count: number;
    deleted_at: number | null;
};
export function headers() { return studioHeaders; }
export async function loader({ request, context }: Route.LoaderArgs) { try {
    const env = context.get(contentEnvironmentContext), { session } = await studioSession(request, env, false, import.meta.env.DEV);
    return data(await studioIdentity(session, env), { headers: studioHeaders });
}
catch (e) {
    throw studioFailure(e);
} }
export default function StudioLibrary({ loaderData: d }: Route.ComponentProps) {
    const [items, setItems] = useState<Asset[]>([]), [q, setQ] = useState(''), [type, setType] = useState(''), [sort, setSort] = useState('newest'), [trash, setTrash] = useState(false), [offset, setOffset] = useState(0), [more, setMore] = useState(false), [message, setMessage] = useState(''), [selected, setSelected] = useState<Asset | null>(null), [uses, setUses] = useState<{
        document_id: string;
        title: string;
        kind: string;
    }[]>([]);
    const searchFocus=useRef<HTMLInputElement>(null), loadGeneration=useRef(0);
    const [loading,setLoading]=useState(true),[pending,setPending]=useState(false),[dirty,setDirty]=useState(false),[usageLoaded,setUsageLoaded]=useState(false);
    const usageGeneration=useRef(0),metadataForm=useRef<HTMLFormElement>(null);
    const [invalidField,setInvalidField]=useState(''),[rightsWarning,setRightsWarning]=useState('');
    const torontoDate=(instant:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);
    const describeRights=(blocked:boolean,expiry:string)=>[blocked?'Public delivery is blocked by an unresolved usage restriction.':'',expiry?(expiry<=torontoDate(Date.now())?'Rights have expired. Public delivery is unavailable.':'Rights have an expiry date; public delivery stops when it is reached.'):''].filter(Boolean).join(' ');
    const revealField=(name:string)=>{setInvalidField(name);const field=metadataForm.current?.elements.namedItem(name);if(field instanceof HTMLElement){const section=field.closest('details');if(section)section.open=true;requestAnimationFrame(()=>field.focus());}};
    const closeDetails=()=>{usageGeneration.current++;setSelected(null);setDirty(false);};
    const load = async (page = 0) => { const generation=++loadGeneration.current;setLoading(true);try {
        const r = await fetch(`/control/studio-media?${new URLSearchParams({ q, type, sort, trash: trash ? '1' : '0', offset: String(page) })}`, { credentials: 'same-origin' }), data = await r.json() as {
            items?: Asset[];
            more?: boolean;
            message?: string;
        };
        if (!r.ok)
            throw Error(data.message);
        if(generation!==loadGeneration.current)return;
        setItems(data.items || []);
        setMore(!!data.more);
        setOffset(page);
        setMessage('');
    }
    catch (e) {
        if(generation===loadGeneration.current)setMessage(e instanceof TypeError?'Unable to load media. Please try again.':e instanceof Error?e.message:'Unable to load media.');
    }finally{if(generation===loadGeneration.current)setLoading(false);} };
    const openDetails=async(asset:Asset,trigger:HTMLElement)=>{
        const generation=++usageGeneration.current;trigger.focus();setSelected(asset);setUses([]);setMessage('');setDirty(false);setUsageLoaded(false);setInvalidField('');setRightsWarning(describeRights(!!asset.publication_blocked,asset.rights_expires_at?torontoDate(asset.rights_expires_at):''));
        // Open immediately so network failures stay visible with the selected image.

        try{const response=await fetch('/control/studio-media?id='+asset.id,{credentials:'same-origin'}),result=await response.json() as {uses?:typeof uses;message?:string};if(!response.ok)throw new Error(result.message||'Unable to load image usage.');if(generation===usageGeneration.current){setUses(result.uses||[]);setUsageLoaded(true);}}
        catch{if(generation===usageGeneration.current)setMessage('Unable to load image usage. Close and retry before deleting this image.');}
    };
    const trashOrRestore=async()=>{
        if(!selected||pending||!usageLoaded||!window.confirm(selected.deleted_at?'Restore this image?':'Move this unused image to recoverable trash?'))return;
        setPending(true);setMessage('');
        try{const response=await fetch('/control/studio-media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':d.csrf},body:new URLSearchParams({id:selected.id,version:String(selected.version),intent:selected.deleted_at?'restore':'trash'})}),result=await response.json() as {message:string};if(!response.ok)throw new Error(result.message);closeDetails();await load();requestAnimationFrame(()=>searchFocus.current?.focus());}
        catch(error){setMessage(error instanceof TypeError?'Unable to update the image. Please try again.':error instanceof Error?error.message:'Unable to update the image.');}
        finally{setPending(false);}
    };
    useEffect(() => { void load(); }, []);
    // Initial load is deferred until hydration; no private image data appears to anonymous visitors.
    return <ControlDashboard {...d} section="Media Library"><section className="media-workspace"><h1>Media Library</h1><p>One shared library for posts, events, homepage images and Community Creations. Metadata is optional.</p><details className="studio-upload-disclosure"><summary>Upload images</summary><StudioUpload multiple csrf={d.csrf} onUploaded={() => load()}/></details><div className="studio-actions"><label>Search filename, creator, description or tags<input ref={searchFocus} value={q} maxLength={160} onChange={e => setQ(e.target.value)}/></label><label>Type<select value={type} onChange={e => setType(e.target.value)}><option value="">All</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></label><label>Sort<select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest</option><option value="name">Name</option></select></label><label><input type="checkbox" checked={trash} onChange={e => setTrash(e.target.checked)}/> Show trash</label><button className="button secondary" type="button" onClick={() => load()}>Search</button></div><p role="status">{loading?'Loading images...':message}</p>{!loading&&!items.length && <p className="content-empty">No images found. Upload images or change the search.</p>}<div className="studio-photo-grid">{items.map(asset => <article className="studio-photo-card" key={asset.id}>{asset.deleted_at?<p>In recoverable trash</p>:<button type="button" className="studio-photo-preview" aria-label={`Edit metadata: ${asset.title}`} onClick={e=>void openDetails(asset,e.currentTarget)}><img src={`/control/media/${asset.id}/preview`} alt={asset.alt_text || asset.title} width={asset.width} height={asset.height} loading="lazy"/></button>}<div className="studio-photo-copy"><h2>{asset.title}</h2><p>{asset.usage_count} active references</p><button className="button secondary" type="button" onClick={e=>void openDetails(asset,e.currentTarget)}><StudioIcon name="edit"/>Edit metadata</button></div></article>)}</div><nav className="studio-actions" aria-label="Media pages">{offset > 0 && <button className="button secondary" onClick={() => load(Math.max(0, offset - 24))}>Previous</button>}{more && <button className="button secondary" onClick={() => load(offset + 24)}>More images</button>}</nav>
 {selected&&<StudioItemDialog title="Image metadata" contextLabel="Shared Media Library asset" dirty={dirty} busy={pending} onDismiss={closeDetails} actions={<button type="submit" form="studio-metadata-form" className="button primary studio-action" disabled={pending||!!selected.deleted_at}><StudioIcon name="save"/>Save Changes</button>} note="These are global asset settings. Creator credits, rights and usage restrictions can affect multiple placements. Placement captions and alt text remain separate."><div className="studio-item-fields"><p role="alert" id="studio-metadata-error">{message}</p>{rightsWarning&&<p role="status" className="studio-rights-warning">{rightsWarning}</p>}<figure className="studio-item-image"><img src={`/control/media/${selected.id}/preview`} alt={selected.alt_text || selected.title} width={selected.width} height={selected.height}/></figure><form ref={metadataForm} id="studio-metadata-form" key={selected.id} onSubmit={async (e) => { e.preventDefault();if(pending)return;setPending(true);setMessage('');setInvalidField(''); const f = new FormData(e.currentTarget), encoded = new URLSearchParams(); for (const [k, v] of f)
        encoded.set(k, String(v)); try {
        const r = await fetch('/control/studio-media', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': d.csrf }, body: encoded }), data = await r.json() as {
            message: string;
        };
        if (!r.ok)
            throw Error(data.message);
        closeDetails();
        load();
    }
    catch (e) {
        const reason=e instanceof Error?e.message:'';const field=/source/i.test(reason)?'source':/licence expiry/i.test(reason)?'rightsExpiry':reason.match(/^Check (\w+)\./)?.[1];if(field)revealField(field);
        setMessage(e instanceof TypeError?'Unable to save metadata. Your input is preserved; please try again.':e instanceof Error ? e.message : 'Save failed.');
    }finally{setPending(false);} }} className="studio-form" onInvalidCapture={e=>{if(e.target instanceof HTMLInputElement){setMessage(e.target.validationMessage);revealField(e.target.name);}}} onChange={()=>{setDirty(true);const form=metadataForm.current;if(form){const values=new FormData(form),expiry=String(values.get('rightsExpiry')||'');setRightsWarning(describeRights(values.get('blocked')==='1',expiry));}}}>
<input type="hidden" name="id" value={selected.id}/><input type="hidden" name="version" value={selected.version}/><input type="hidden" name="intent" value="metadata"/>
{[['title','Image title',selected.title],['alt','Default image description / alt text (optional)',selected.alt_text]].map(([name,label,value])=><label key={name}>{label}<input name={name} defaultValue={value} disabled={pending||!!selected.deleted_at} maxLength={name==='title'?160:1000} aria-invalid={invalidField===name} aria-describedby={invalidField===name?'studio-metadata-error':undefined}/></label>)}
<details className="studio-metadata-section"><summary>Details &amp; Credits{['creator','description','tags','source','requiredCredit'].includes(invalidField)&&' - Check invalid field'}</summary><div>
{[['creator','Created / captured by (optional)',selected.creator_name],['description','Description (optional)',selected.description],['tags','Tags (optional)',selected.tags],['source','Source URL (optional)',selected.source_url],['requiredCredit','Required third-party attribution (only when the licence requires it)',selected.required_credit]].map(([name,label,value])=><label key={name}>{label}<input name={name} defaultValue={value} disabled={pending||!!selected.deleted_at} maxLength={name==='creator'?160:name==='source'?2048:name==='description'?4000:1000} aria-invalid={invalidField===name} aria-describedby={invalidField===name?'studio-metadata-error':undefined}/></label>)}
</div></details>
<details className="studio-metadata-section"><summary>Rights &amp; Restrictions{invalidField==='rightsExpiry'?' - Check invalid field':rightsWarning?' - Rights warning':''}</summary><div>
<label className="studio-inline-check"><input type="checkbox" name="blocked" disabled={pending||!!selected.deleted_at} value="1" defaultChecked={!!selected.publication_blocked}/> Unresolved usage restriction - block public delivery</label><label>Licence expires (optional, start of date in Toronto)<input type="date" name="rightsExpiry" disabled={pending||!!selected.deleted_at} defaultValue={selected.rights_expires_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(selected.rights_expires_at) : ''} aria-invalid={invalidField==='rightsExpiry'} aria-describedby={invalidField==='rightsExpiry'?'studio-metadata-error':undefined}/></label><p>Restoring restricted or expired rights requires republishing the affected content. Creator credits appear automatically only in Community Gallery. Required licence attribution appears wherever the image is used.</p>
</div></details>
<details className="studio-metadata-section"><summary>Internal &amp; Usage Information{invalidField==='notes'&&' - Check invalid field'}{!usageLoaded&&' - Usage unavailable or loading'}</summary><div>
<label>Internal notes (optional)<input name="notes" defaultValue={selected.internal_notes} disabled={pending||!!selected.deleted_at} maxLength={4000} aria-invalid={invalidField==='notes'} aria-describedby={invalidField==='notes'?'studio-metadata-error':undefined}/></label><h3>Used by</h3>{uses.length ? <ul>{uses.map(u => <li key={u.document_id}><a href={['homepage', 'banners', 'gallery','about-memories'].includes(u.kind) ? `/control/collections/${u.kind}` : `/control/posts/${u.document_id}`}>{u.title}</a></li>)}</ul> : <p>{usageLoaded?'No active content references.':'Usage information unavailable or loading.'}</p>}<div className="studio-actions"><button type="button" className="button secondary" disabled={pending||!usageLoaded||(!selected.deleted_at && selected.usage_count > 0)} onClick={()=>void trashOrRestore()}><StudioIcon name="remove"/>{selected.deleted_at ? 'Restore image' : 'Move unused image to trash'}</button></div></div></details></form></div></StudioItemDialog>}
 </section></ControlDashboard>;
}
