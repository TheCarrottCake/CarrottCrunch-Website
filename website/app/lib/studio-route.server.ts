import { data, redirect } from 'react-router';
import { studioSession, studioIdentity, studioHeaders, studioFailure, StudioError } from './content-studio.server.ts';
import { studioGet, studioSave, studioAction, studioHistory } from './studio.server.ts';
import type { MediaEnvironment } from './media-db.server.ts';
import { metadataForm } from './media-access.server.ts';
import { resolveEventTime, reopenEventTime, EVENT_TIMEZONE } from './event-time.ts';
import type { StudioKind, StudioSnapshot } from './studio-model.ts';
import { studioImages,studioSnapshotImages } from './studio-media.server.ts';
export async function studioEditorLoader(request: Request, env: MediaEnvironment, id: string | undefined, kind: StudioKind, development: boolean) {
    try {
        const { session, db } = await studioSession(request, env, false, development);
        const saved = id ? await studioGet(db, id) : null;
        const snapshot: StudioSnapshot = saved?.snapshot || (kind === 'about-memories'
            ? {title:'About memories',body_text:'',memories:{}}
            : { title: ['homepage', 'banners', 'gallery'].includes(kind) ? ({ homepage: 'Homepage showcase', banners: 'Homepage banners', gallery: 'Community Creations' }[kind as 'homepage'] || 'Community Creations') : '', body_text: '', coverId: '', items: ['homepage', 'banners', 'gallery'].includes(kind) ? [] : undefined });
        return data({ ...await studioIdentity(session, env), notice:new URL(request.url).searchParams.get('done')==='1'?'Changes saved.':'', document: saved?.document || null, snapshot, kind: saved?.document.kind || kind, images: saved ? await studioImages(db, saved.document.id, saved.document.revision) : {}, history: saved ? await studioHistory(db, saved.document.id) : [] }, { headers: studioHeaders });
    }
    catch (e) {
        throw studioFailure(e);
    }
}
export async function studioEditorAction(request: Request, env: MediaEnvironment, id: string | undefined, kind: StudioKind, development: boolean) {
    let snapshot: StudioSnapshot | undefined;
    try {
        const { session } = await studioSession(request, env, true, development);
        const form = await metadataForm(request);
        const version = Number(form.get('version') || 0), intent = String(form.get('intent'));
        if (!Number.isSafeInteger(version) || form.getAll('intent').length !== 1)
            throw new StudioError('Reload this editor.', 409);
        if(form.has('snapshot')){if(form.getAll('snapshot').length!==1||String(form.get('snapshot')).length>180000)throw new StudioError('Use the supplied editor.');try{snapshot=JSON.parse(String(form.get('snapshot')));}catch{throw new StudioError('Check the submitted content.');}if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new StudioError('Check the content.');}
        if (['restore', 'unpublish', 'archive', 'delete', 'cancel-schedule'].includes(intent)) {
            if (!id)
                throw new StudioError('Save this content first.');
            await studioAction(env, session, id, version, intent, undefined, Number(form.get('restoreRevision')));
            return redirect(['homepage', 'banners', 'gallery', 'about-memories'].includes(kind) ? `/control/collections/${kind}?done=1` : intent === 'delete' ? '/control/posts' : `/control/posts/${id}?done=1`, { status: 303, headers: studioHeaders });
        }
        if (!['save', 'publish', 'schedule'].includes(intent))
            throw new StudioError('Choose Save, Publish or Schedule.');
        if (form.getAll('snapshot').length !== 1 || String(form.get('snapshot')).length > 180000)
            throw new StudioError('Use the supplied editor.');
        if (!snapshot || typeof snapshot !== 'object'||Array.isArray(snapshot))
            throw new StudioError('Check the content.');
        if (kind === 'event') {
            const previous = id ? (await studioGet(env.CONTENT_DB!, id)).snapshot : null;
            const originalStart = previous?.starts_at ? reopenEventTime(previous.starts_at, EVENT_TIMEZONE) : null, originalEnd = previous?.ends_at ? reopenEventTime(previous.ends_at, EVENT_TIMEZONE) : null;
            const fields = snapshot.eventInput || { eventDate: originalStart?.local.slice(0, 10) || '', startTime: originalStart?.local.slice(11, 16) || '', endDate: originalEnd?.local.slice(0, 10) || '', endTime: originalEnd?.local.slice(11, 16) || '', startOccurrence: originalStart?.occurrence || '', endOccurrence: originalEnd?.occurrence || '' };
            const parse = (local: string, occurrence: string, original?: number) => { if (original !== undefined) {
                const old = reopenEventTime(original, EVENT_TIMEZONE);
                if (local === old.local.slice(0, 16) && occurrence === old.occurrence)
                    return original;
            } if (!/^\d{4}-\d{2}-\d{2}T\d{2}:(00|15|30|45)$/.test(local))
                throw new StudioError('Choose a date and time from the 15-minute options.'); return resolveTime(local, occurrence); };
            const date = fields.eventDate || String(form.get('eventDate') || ''), start = fields.startTime || String(form.get('startTime') || ''), endDate = fields.endDate || String(form.get('endDate') || date) || date, end = fields.endTime || String(form.get('endTime') || '');
            snapshot.starts_at = parse(`${date}T${start}`, fields.startOccurrence ?? String(form.get('startOccurrence') || ''), previous?.starts_at);
            snapshot.ends_at = end ? parse(`${endDate}T${end}`, fields.endOccurrence ?? String(form.get('endOccurrence') || ''), previous?.ends_at) : snapshot.starts_at + 3600000;
            snapshot.timezone = EVENT_TIMEZONE;
        }
        let due: number | undefined;
        if (intent === 'schedule') {
            snapshot.scheduleInput = { date: String(form.get('date') || ''), time: String(form.get('time') || ''), occurrence: String(form.get('occurrence') || '') };
            due = resolveTime(`${form.get('date')}T${form.get('time')}`, String(form.get('occurrence') || ''));
            if (!/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(String(form.get('time'))))
                throw new StudioError('Choose a 15-minute publication time.');
        }
        const docId = await studioSave(env, session, id || null, kind, snapshot, version, intent === 'publish', due);
        return redirect(['homepage', 'banners', 'gallery', 'about-memories'].includes(kind) ? `/control/collections/${kind}?done=1` : `/control/posts/${docId}?done=1`, { status: 303, headers: studioHeaders });
    }
    catch (e) {
        const failure = studioFailure(e);
        return data({ message: await failure.text(), status: failure.status, snapshot, images:snapshot&&env.CONTENT_DB?await studioSnapshotImages(env.CONTENT_DB,snapshot).catch(()=>({})):undefined }, { status: failure.status, headers: studioHeaders });
    }
}

function resolveTime(local:string,occurrence:string){
    try{return resolveEventTime(local,EVENT_TIMEZONE,occurrence);}
    catch(error){throw new StudioError(error instanceof Error?error.message:'Check the date and time.');}
}
