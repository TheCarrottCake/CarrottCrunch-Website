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
    const dialog = useRef<HTMLDialogElement>(null), returnFocus = useRef<HTMLElement | null>(null), searchFocus=useRef<HTMLInputElement>(null), loadGeneration=useRef(0);
    const [loading,setLoading]=useState(true),[pending,setPending]=useState(false);
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
        returnFocus.current=trigger;setSelected(asset);setUses([]);setMessage('');
        // Open immediately so network failures stay visible with the selected image.
        requestAnimationFrame(()=>dialog.current?.showModal());
        try{const response=await fetch('/control/studio-media?id='+asset.id,{credentials:'same-origin'}),result=await response.json() as {uses?:typeof uses;message?:string};if(!response.ok)throw new Error(result.message||'Unable to load image usage.');setUses(result.uses||[]);}
        catch{setMessage('Unable to load image usage. Close and retry before deleting this image.');}
    };
    const trashOrRestore=async()=>{
        if(!selected||pending||!window.confirm(selected.deleted_at?'Restore this image?':'Move this unused image to recoverable trash?'))return;
        setPending(true);setMessage('');
        try{const response=await fetch('/control/studio-media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':d.csrf},body:new URLSearchParams({id:selected.id,version:String(selected.version),intent:selected.deleted_at?'restore':'trash'})}),result=await response.json() as {message:string};if(!response.ok)throw new Error(result.message);dialog.current?.close();await load();}
        catch(error){setMessage(error instanceof TypeError?'Unable to update the image. Please try again.':error instanceof Error?error.message:'Unable to update the image.');}
        finally{setPending(false);}
    };
    useEffect(() => { void load(); }, []);
    // Initial load is deferred until hydration; no private image data appears to anonymous visitors.
    return <ControlDashboard {...d} section="Media Library"><section className="media-workspace"><h1>Media Library</h1><p>One shared library for posts, events, homepage images and Community Creations. Metadata is optional.</p><StudioUpload multiple csrf={d.csrf} onUploaded={() => load()}/><div className="studio-actions"><label>Search filename, creator, description or tags<input ref={searchFocus} value={q} maxLength={160} onChange={e => setQ(e.target.value)}/></label><label>Type<select value={type} onChange={e => setType(e.target.value)}><option value="">All</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></label><label>Sort<select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest</option><option value="name">Name</option></select></label><label><input type="checkbox" checked={trash} onChange={e => setTrash(e.target.checked)}/> Show trash</label><button className="button secondary" type="button" onClick={() => load()}>Search</button></div><p role="status">{loading?'Loading images...':message}</p>{!loading&&!items.length && <p className="content-empty">No images found. Upload images or change the search.</p>}<div className="media-picker-grid">{items.map(asset => <article className="public-card" key={asset.id}>{asset.deleted_at?<p>In recoverable trash</p>:<img className="upload-local-preview" src={`/control/media/${asset.id}/preview`} alt={asset.alt_text || asset.title}/>}<h2>{asset.title}</h2><p>{asset.usage_count} active references</p><button className="button secondary" type="button" onClick={e=>void openDetails(asset,e.currentTarget)}>Details & metadata</button></article>)}</div><nav className="studio-actions" aria-label="Media pages">{offset > 0 && <button className="button secondary" onClick={() => load(Math.max(0, offset - 24))}>Previous</button>}{more && <button className="button secondary" onClick={() => load(offset + 24)}>More images</button>}</nav>
 <dialog ref={dialog} className="media-picker" aria-labelledby="media-details-title" onClose={() => { setSelected(null); (returnFocus.current?.isConnected?returnFocus.current:searchFocus.current)?.focus(); }}>{selected && <><h2 id="media-details-title">Image details</h2><img className="upload-local-preview" src={`/control/media/${selected.id}/preview`} alt={selected.alt_text || selected.title}/><form key={selected.id} onSubmit={async (e) => { e.preventDefault();if(pending)return;setPending(true);setMessage(''); const f = new FormData(e.currentTarget), encoded = new URLSearchParams(); for (const [k, v] of f)
        encoded.set(k, String(v)); try {
        const r = await fetch('/control/studio-media', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': d.csrf }, body: encoded }), data = await r.json() as {
            message: string;
        };
        if (!r.ok)
            throw Error(data.message);
        dialog.current?.close();
        load();
    }
    catch (e) {
        setMessage(e instanceof TypeError?'Unable to save metadata. Your input is preserved; please try again.':e instanceof Error ? e.message : 'Save failed.');
    }finally{setPending(false);} }} className="studio-form"><input type="hidden" name="id" value={selected.id}/><input type="hidden" name="version" value={selected.version}/><input type="hidden" name="intent" value="metadata"/>{[['title', 'Title', selected.title], ['creator', 'Created / captured by (optional)', selected.creator_name], ['description', 'Description (optional)', selected.description], ['tags', 'Tags (optional)', selected.tags], ['notes', 'Internal notes (optional)', selected.internal_notes], ['alt', 'Default image description (optional)', selected.alt_text], ['source', 'Source URL (optional)', selected.source_url], ['requiredCredit', 'Required third-party attribution (only when the licence requires it)', selected.required_credit]].map(([name, label, value]) => <label key={name}>{label}<input name={name} defaultValue={value} disabled={pending} maxLength={name==='title'||name==='creator'?160:name==='source'?2048:name === 'description' || name === 'notes' ? 4000 : 1000}/></label>)}<label><input type="checkbox" name="blocked" value="1" defaultChecked={!!selected.publication_blocked}/> Unresolved usage restriction — block public delivery</label><label>Licence expires (optional, start of date in Toronto)<input type="date" name="rightsExpiry" defaultValue={selected.rights_expires_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(selected.rights_expires_at) : ''}/></label><p>Restoring restricted or expired rights requires republishing the affected content. Creator credits appear automatically only in Community Gallery. Required licence attribution appears wherever the image is used.</p><button className="button primary" disabled={pending||!!selected.deleted_at}>Save metadata</button></form><h3>Used by</h3>{uses.length ? <ul>{uses.map(u => <li key={u.document_id}><a href={['homepage', 'banners', 'gallery'].includes(u.kind) ? `/control/collections/${u.kind}` : `/control/posts/${u.document_id}`}>{u.title}</a></li>)}</ul> : <p>No active content references.</p>}<div className="studio-actions"><button type="button" className="button secondary" disabled={pending||(!selected.deleted_at && selected.usage_count > 0)} onClick={()=>void trashOrRestore()}>{selected.deleted_at ? 'Restore image' : 'Delete unused image'}</button><button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Close</button></div><p role="alert">{message}</p></>}</dialog>
 </section></ControlDashboard>;
}
