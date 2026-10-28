import { AboutMemoriesFields, AboutMemoriesPreview } from './about-memories-editor';
import { useEffect, useRef, useState } from 'react';
import { Form, Link, useNavigation } from 'react-router';
import type { StudioSnapshot, StudioDocument, StudioImage, StudioKind, StudioItem } from '../lib/studio-model';
import { StudioMediaPicker, StudioUpload, type PickerAsset } from './studio-media-picker';
import { StudioPreview } from './studio-render';
import { PublicationTime } from './publication-time';
import { clockLabel, eventTimeOptions, eventTimeChoices, resolveEventTime, reopenEventTime, EVENT_TIMEZONE } from '../lib/event-time';
type Props = {
    document: StudioDocument | null;
    snapshot: StudioSnapshot;
    kind: StudioKind;
    csrf: string;
    role: string;
    images: Record<string, StudioImage>;
    history: {
        revision: number;
        created_at: number;
        author: string;
    }[];
    message?: string;notice?:string;
};
export function StudioEditor({ document: d, snapshot: initial, kind, csrf, role, images: initialImages, history, message,notice }: Props) {
    const [s, setS] = useState(initial), [images, setImages] = useState(initialImages), [preview, setPreview] = useState(false), [uploading, setUploading] = useState(false), [schedule, setSchedule] = useState(!!message && !!initial.scheduleInput);
    const dialog = useRef<HTMLDialogElement>(null), scheduleButton = useRef<HTMLButtonElement>(null), body = useRef<HTMLTextAreaElement>(null);
    const nav = useNavigation(), busy = nav.state !== 'idle' || uploading, collection = ['homepage', 'gallery', 'banners', 'about-memories'].includes(kind);
    useEffect(() => { if (message && initial.scheduleInput)
        dialog.current?.showModal(); }, []);
    const dirty = !!message || JSON.stringify(initial) !== JSON.stringify(s), change = (name: keyof StudioSnapshot, value: unknown) => setS(current => ({ ...current, [name]: value }));
    useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty || uploading) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, uploading]);
    const useImage = (asset: PickerAsset, placement = 'cover') => { const image: StudioImage = { assetId: asset.id, src: `/control/media/${asset.id}/preview`, cardSrc: `/control/media/${asset.id}/preview`, width: asset.width, height: asset.height, alt: asset.alt_text, creator: asset.creator_name, requiredCredit: asset.required_credit||'', source: asset.source_url||'' }; setImages(current => ({ ...current, [placement]: image })); if (placement === 'cover')
        setS(current => ({ ...current, coverId: asset.id })); };
    const addItem = (asset: PickerAsset) => { const id = crypto.randomUUID(); useImage(asset, id); setS(current => ({ ...current, items: [...(current.items || []), { id, assetId: asset.id, title: '', description: '', link: '', linkText: '', enabled: true, featured: false, alt: asset.alt_text || '' }] })); };
    const updateItem = (id: string, patch: Partial<StudioItem>) => setS(current => ({ ...current, items: current.items?.map(i => i.id === id ? { ...i, ...patch } : i) }));
    const insert = (prefix: string, suffix = '') => { const el = body.current; if (!el)
        return; const a = el.selectionStart, b = el.selectionEnd; change('body_text', s.body_text.slice(0, a) + prefix + s.body_text.slice(a, b) + suffix + s.body_text.slice(b)); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + prefix.length, b + prefix.length); }); };
    const inline = (asset: PickerAsset) => { const n = (s.body_text.match(/!\[[^\]]*\]\(media:/g) || []).length; useImage(asset, `inline:${n}`); insert(`\n\n![${asset.alt_text || s.title || 'Image'}](media:${asset.id})\n\n`); };
    return <section className="studio-workspace"><header className="editor-toolbar"><div className="editor-toolbar-heading"><h1>{collection ? s.title : kind === 'event' ? 'Event' : 'Post'}</h1><p className="editor-toolbar-state">{d?.status === 'archived' ? 'Archived' : d?.status || 'Draft'} · {dirty ? 'Unsaved changes' : 'Saved'}{d ? ` · Working revision ${d.revision}` : ''}{d?.live_release_id ? ' · Public version remains live' : ''}</p></div><div className="editor-toolbar-actions">
 <button className="button secondary" form="studio-document-form" name="intent" value={d?.live_release_id ? 'publish' : 'save'} disabled={busy} onClick={e => { if (d?.live_release_id && !window.confirm('Save these changes to the public version?'))
        e.preventDefault(); }}>{d?.live_release_id ? 'Save Changes' : 'Save Draft'}</button>
 <button type="button" className="button secondary" onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
 {!d?.live_release_id && <button className="button primary" form="studio-document-form" name="intent" value="publish" disabled={busy} onClick={e => { if (!window.confirm('Publish this content publicly?'))
        e.preventDefault(); }}>Publish</button>}
 {d?.live_release_id && <button form="studio-document-form" name="intent" value="unpublish" formNoValidate className="button secondary" disabled={busy} onClick={e => { if (!window.confirm('Remove this content from public view?'))
        e.preventDefault(); }}>Unpublish</button>}
 <details className="editor-more" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}><summary className="button secondary">More</summary><div className="editor-more-panel"><button type="button" className="button secondary" ref={scheduleButton} disabled={busy} onClick={() => { if(!(document.getElementById('studio-document-form') as HTMLFormElement|null)?.reportValidity())return;setSchedule(true); requestAnimationFrame(() => dialog.current?.showModal()); }}>Schedule</button><button className="button secondary" form="studio-document-form" name="intent" value="save" disabled={busy}>Save private draft</button>{d?.pending_release_id && <button className="button secondary" form="studio-document-form" name="intent" value="cancel-schedule" formNoValidate>Cancel schedule</button>}{d && <button className="button secondary" form="studio-document-form" name="intent" value="archive" formNoValidate onClick={e => { if (!window.confirm('Archive this content and remove it from public view?'))
        e.preventDefault(); }}>Archive</button>}{d && role !== 'Moderator' && <button className="button draft-delete-confirm" form="studio-document-form" name="intent" value="delete" formNoValidate onClick={e => { if (!window.confirm('Delete this content from management? Historical records are retained.'))
        e.preventDefault(); }}>Delete</button>}</div></details>
 </div></header>{(busy||notice)&&<p role="status" className="studio-message">{uploading?'Uploading...':busy?'Saving...':notice}</p>}{message && <p role="alert" className="studio-message">{message}</p>}
 <Form method="post" id="studio-document-form" className="studio-form"><input type="hidden" name="_csrf" value={csrf}/><input type="hidden" name="version" value={d?.version || 0}/><input type="hidden" name="snapshot" value={JSON.stringify(s)}/>
 {preview ? kind === 'about-memories' ? <AboutMemoriesPreview snapshot={s} images={images}/> : <StudioPreview snapshot={s} images={images} kind={kind}/> : <>
 {kind === 'about-memories' && <AboutMemoriesFields snapshot={s} images={images} csrf={csrf} onBusy={setUploading} onChange={memories=>change('memories',memories)} onImage={useImage}/>}
 {!collection && <><label>Title<input value={s.title} maxLength={160} required onChange={e => change('title', e.target.value)}/></label><section className="public-card"><h2>Cover image <small>(optional)</small></h2>{s.coverId && <><img className="upload-local-preview" src={`/control/media/${s.coverId}/preview`} alt={s.coverAlt || s.title}/><label>Image description<input maxLength={1000} value={s.coverAlt || ''} placeholder="Use the title as context, or describe the image" onChange={e => change('coverAlt', e.target.value)}/></label><button type="button" className="button secondary" onClick={() => change('coverId', '')}>Remove Image</button></>}<StudioUpload label={s.coverId ? 'Replace Image' : 'Upload Image'} csrf={csrf} onUploaded={asset => useImage(asset)} onBusy={setUploading}/><StudioMediaPicker csrf={csrf} onSelect={asset => useImage(asset)}/></section>
 <label htmlFor="studio-body">Content</label><div className="studio-actions" aria-label="Formatting"><button type="button" className="button secondary" onClick={() => insert('## ')}>Heading</button><button type="button" className="button secondary" onClick={() => insert('**', '**')}>Bold</button><button type="button" className="button secondary" onClick={() => insert('*', '*')}>Italic</button><button type="button" className="button secondary" onClick={() => insert('- ')}>List</button><button type="button" className="button secondary" onClick={() => insert('[', '](https://)')}>Link</button><StudioMediaPicker label="Insert Image" csrf={csrf} onSelect={inline}/></div><textarea id="studio-body" ref={body} rows={16} maxLength={40000} value={s.body_text} onChange={e => change('body_text', e.target.value)}/>
 {kind === 'event' && <><EventTiming snapshot={s} onChange={next => setS(next)}/><label>Location (optional)<input value={s.location || ''} maxLength={300} onChange={e => change('location', e.target.value)}/></label></>}
 </>}
 {collection && kind !== 'about-memories' && <><div className="studio-actions"><StudioUpload multiple csrf={csrf} onUploaded={addItem} onBusy={setUploading}/><StudioMediaPicker label={kind === 'gallery' ? 'Add Images' : 'Add Slide'} csrf={csrf} onSelect={addItem}/></div>{!s.items?.length && <p className="content-empty">No images yet. Upload or select an image to begin.</p>}{s.items?.map((item, index) => <article key={item.id} className="public-card studio-collection-item"><img className="upload-local-preview" src={`/control/media/${item.assetId}/preview`} alt={item.alt || item.title || s.title}/><label>{kind === 'gallery' ? 'Display title' : 'Heading'} (optional)<input maxLength={160} value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })}/></label><label>Description (optional)<textarea maxLength={4000} value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })}/></label><label>Image description<input maxLength={1000} value={item.alt} placeholder={item.title || s.title} onChange={e => updateItem(item.id, { alt: e.target.value })}/></label>{kind !== 'gallery' && <><label>Same-site link (optional)<input value={item.link} placeholder="/community" onChange={e => updateItem(item.id, { link: e.target.value })}/></label><label>Link text<input value={item.linkText} onChange={e => updateItem(item.id, { linkText: e.target.value })}/></label></>}<label><input type="checkbox" checked={item.enabled} onChange={e => updateItem(item.id, { enabled: e.target.checked })}/> Visible</label>{kind === 'gallery' && <label><input type="checkbox" checked={item.featured} onChange={e => updateItem(item.id, { featured: e.target.checked })}/> Featured</label>}<div className="studio-actions">{[-1, 1].map(direction => <button key={direction} type="button" className="button secondary" disabled={index + direction < 0 || index + direction >= s.items!.length} onClick={() => { const items = [...s.items!]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; change('items', items); }}>{direction < 0 ? 'Move up' : 'Move down'}<span className="sr-only">: image {index + 1}</span></button>)}<StudioMediaPicker label="Replace Image" csrf={csrf} onSelect={asset => { useImage(asset, item.id); updateItem(item.id, { assetId: asset.id }); }}/><button type="button" className="button secondary" onClick={() => change('items', s.items?.filter(i => i.id !== item.id))}>Remove</button></div></article>)}</>}
 </>}
 <dialog ref={dialog} className="draft-delete-dialog editor-action-dialog" aria-labelledby="studio-schedule-title" onClose={() => { setSchedule(false); scheduleButton.current?.focus(); }}><h2 id="studio-schedule-title">Schedule publication</h2>{schedule && <PublicationTime initial={initial.scheduleInput}/>}<div className="studio-actions"><button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Cancel</button><button name="intent" value="schedule" className="button primary" disabled={busy}>Schedule</button></div></dialog>
 </Form>
 {history.length > 0 && <details className="public-card"><summary>Revision history</summary><ol>{history.map(h => <li key={h.revision}>Revision {h.revision} · {h.author} · {new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(h.created_at)}<Form method="post"><input type="hidden" name="_csrf" value={csrf}/><input type="hidden" name="version" value={d?.version}/><input type="hidden" name="restoreRevision" value={h.revision}/><button className="button secondary" name="intent" value="restore" disabled={busy || h.revision === d?.revision} onClick={e => { if (!window.confirm(`Restore revision ${h.revision} as a new private revision? Unsaved input will be replaced.`))
        e.preventDefault(); }}>Restore revision {h.revision}</button></Form></li>)}</ol></details>}
 {!collection && <Link className="text-link" to="/control/posts">All posts & events</Link>}
 </section>;
}
function EventTiming({ snapshot: s, onChange }: {
    snapshot: StudioSnapshot;
    onChange: (s: StudioSnapshot) => void;
}) {
    const originalStart = s.starts_at ? reopenEventTime(s.starts_at, EVENT_TIMEZONE) : null, originalEnd = s.ends_at ? reopenEventTime(s.ends_at, EVENT_TIMEZONE) : null;
    const values = s.eventInput || { eventDate: originalStart?.local.slice(0, 10) || '', startTime: originalStart?.local.slice(11, 16) || '', endDate: originalEnd?.local.slice(0, 10) || '', endTime: originalEnd?.local.slice(11, 16) || '', startOccurrence: originalStart?.occurrence || '', endOccurrence: originalEnd?.occurrence || '' };
    let error = '';
    const repeated = (date: string, time: string) => { try {
        return !!date && !!time && eventTimeChoices(date + 'T' + time, EVENT_TIMEZONE).length === 2;
    }
    catch {
        return false;
    } };
    const change = (key: string, value: string) => { const next = { ...values, [key]: value }; if (['eventDate', 'startTime'].includes(key))
        next.startOccurrence = ''; if (['endDate', 'endTime'].includes(key))
        next.endOccurrence = ''; const snapshot = { ...s, eventInput: next }; try {
        snapshot.starts_at = resolveEventTime(next.eventDate + 'T' + next.startTime, EVENT_TIMEZONE, next.startOccurrence);
        snapshot.ends_at = next.endTime ? resolveEventTime((next.endDate || next.eventDate) + 'T' + next.endTime, EVENT_TIMEZONE, next.endOccurrence) : snapshot.starts_at + 3600000;
    }
    catch {
        snapshot.starts_at = undefined;
        snapshot.ends_at = undefined;
    } onChange(snapshot); };
    try {
        if (values.eventDate && values.startTime)
            resolveEventTime(values.eventDate + 'T' + values.startTime, EVENT_TIMEZONE, values.startOccurrence);
        if (values.endTime)
            resolveEventTime((values.endDate || values.eventDate) + 'T' + values.endTime, EVENT_TIMEZONE, values.endOccurrence);
    }
    catch (e) {
        error = (e as Error).message;
    }
    const options = (value: string) => <>{value && !eventTimeOptions.some(o => o.value === value) && <option value={value}>{clockLabel(value)} (saved time)</option>}{eventTimeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</>;
    return <fieldset className="event-schedule"><legend>Event date and time (Toronto)</legend><label>Date<input type="date" value={values.eventDate} required onChange={e => change('eventDate', e.target.value)}/></label><label>Start<select value={values.startTime} required onChange={e => change('startTime', e.target.value)}><option value="">Choose a time</option>{options(values.startTime)}</select></label><label>End (optional, defaults to one hour)<select value={values.endTime} onChange={e => change('endTime', e.target.value)}><option value="">One hour after start</option>{options(values.endTime)}</select></label><label>End date (optional)<input type="date" value={values.endDate} onChange={e => change('endDate', e.target.value)}/></label>{(['start', 'end'] as const).map(which => repeated(which === 'start' ? values.eventDate : values.endDate || values.eventDate, values[which + 'Time']) && <label key={which}>The clocks repeat this {which} time<select required value={values[which + 'Occurrence']} onChange={e => change(which + 'Occurrence', e.target.value)}><option value="">Choose first or second</option><option value="earlier">First time</option><option value="later">Second time</option></select></label>)}{error && <p role="alert" className="studio-field-error">{error}</p>}</fieldset>;
}
