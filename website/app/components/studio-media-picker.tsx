import { useEffect, useId, useRef, useState } from 'react';
export type PickerAsset = {
    id: string;
    title: string;
    alt_text: string;
    width: number;
    height: number;
    creator_name: string;
    publication_blocked?: number;required_credit?:string;source_url?:string;
};
export function StudioMediaPicker({ csrf, onSelect, label = 'Choose from Media Library' }: {
    csrf: string;
    onSelect: (asset: PickerAsset) => void;
    label?: string;
}) {
    const id = useId(), dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), search = useRef<HTMLInputElement>(null), [open, setOpen] = useState(false), [q, setQ] = useState(''), [items, setItems] = useState<PickerAsset[]>([]), [offset, setOffset] = useState(0), [more, setMore] = useState(false), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const load = async (page = 0) => { setBusy(true); try {
        const r = await fetch(`/control/studio-media?${new URLSearchParams({ q, offset: String(page) })}`, { credentials: 'same-origin' }), data = await r.json() as {
            items?: PickerAsset[];
            more?: boolean;
            message?: string;
        };
        if (!r.ok)
            throw Error(data.message);
        setItems(data.items || []);
        setMore(!!data.more);
        setOffset(page);
        setMessage('');
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Unable to load images.');
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { if (open) {
        dialog.current?.showModal();
        search.current?.focus();
        load();
    }
    else
        dialog.current?.close(); }, [open]);
    return <><button type="button" className="button secondary" ref={trigger} aria-haspopup="dialog" onClick={() => setOpen(true)}>{label}</button><dialog className="media-picker" ref={dialog} aria-labelledby={id} onCancel={() => setOpen(false)} onClose={() => { setOpen(false); trigger.current?.focus(); }} onKeyDown={e => { if (e.key !== 'Tab')
        return; const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select')); const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
    } }}>
 {open && <><h2 id={id}>Media Library</h2><div className="studio-actions"><label>Search images<input ref={search} value={q} maxLength={160} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') {
            e.preventDefault();
            load();
        } }}/></label><button type="button" className="button secondary" onClick={() => load()}>Search</button></div><StudioUpload csrf={csrf} onUploaded={asset => { onSelect(asset); setOpen(false); }}/>
 <p role="status">{busy ? 'Loading images…' : message || (!items.length ? 'No images yet. Upload one here.' : 'Select an image to reuse it.')}</p><div className="media-picker-grid">{items.map(asset => <button key={asset.id} type="button" className="media-picker-option" disabled={!!asset.publication_blocked} onClick={() => { onSelect(asset); setOpen(false); }}><img src={`/control/media/${asset.id}/preview`} alt="" width={asset.width} height={asset.height} loading="lazy"/><strong>{asset.title}</strong>{!!asset.publication_blocked && <span>Unresolved licence restriction</span>}</button>)}</div><div className="studio-actions">{offset > 0 && <button type="button" className="button secondary" onClick={() => load(Math.max(0, offset - 24))}>Previous</button>}{more && <button type="button" className="button secondary" onClick={() => load(offset + 24)}>More images</button>}<button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button></div></>}
 </dialog></>;
}
export function StudioUpload({ csrf, onUploaded, multiple = false, onBusy, label = 'Upload Image' }: {
    label?: string;
    csrf: string;
    onUploaded: (asset: PickerAsset) => void;
    multiple?: boolean;
    onBusy?: (busy: boolean) => void;
}) {
    const input = useRef<HTMLInputElement>(null), lock = useRef(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const upload = async (files: FileList | null) => {
        if (lock.current || !files?.length)
            return;
        lock.current = true;
        setBusy(true);
        onBusy?.(true);
        setMessage('');
        const f = new FormData();
        for (const file of Array.from(files).slice(0, multiple ? 10 : 1))
            f.append('image', file);
        try {
            const r = await fetch('/control/studio-media', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf }, body: f }), result = await r.json() as {
                assets?: PickerAsset[];
                errors?: string[];
                message?: string;
            };
            if (!r.ok || !result.assets?.length)
                throw Error(result.message || result.errors?.join(' ') || 'Upload failed. Your previous image is unchanged.');
            for (const asset of result.assets)
                onUploaded(asset);
            setMessage(result.errors?.join(' ') || 'Uploaded to the shared Media Library.');
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : 'Upload failed.');
        }
        finally {
            lock.current = false;
            setBusy(false);
            onBusy?.(false);
            if (input.current)
                input.current.value = '';
        }
    };
    return <section className="image-dropzone" aria-label="Upload images" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files); }}><button type="button" className="button primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : multiple ? 'Upload images' : label}</button><input hidden ref={input} type="file" multiple={multiple} accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files)}/><span>or drop {multiple ? 'images' : 'an image'} here</span><p className="muted">JPEG, PNG or WebP · 20 MB total · 4096 pixels per side, 4 million pixels. Metadata is optional.</p><p role="status">{message}</p></section>;
}
