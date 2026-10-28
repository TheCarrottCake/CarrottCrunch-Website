import { MediaError, type MediaEnvironment } from './media-db.server.ts';
import { assetIdValid, type StudioImage, type StudioSnapshot } from './studio-model.ts';

/** Rehydrate unsaved selections after a rejected form without changing any revision. */
export async function studioSnapshotImages(db: D1Database, snapshot: StudioSnapshot) {
    const placements = [{placement:'cover',assetId:snapshot.coverId||''},
        ...(['opening','history'] as const).map(slot=>({placement:`memory:${slot}`,assetId:snapshot.memories?.[slot]?.assetId||''})),
        ...(Array.isArray(snapshot.items)?snapshot.items.slice(0,100).map(item=>({placement:item.id,assetId:item.assetId})):[]),
        ...Array.from(String(snapshot.body_text||'').matchAll(/!\[[^\]\n]*\]\(media:([a-f0-9-]{36})\)/g), (match,index)=>({placement:`inline:${index}`,assetId:match[1]}))]
        .filter(item=>assetIdValid(item.assetId)).slice(0,100);
    if(!placements.length)return {} as Record<string,StudioImage>;
    const rows=await db.prepare(`SELECT a.id,a.width,a.height,a.alt_text,a.required_credit,t.creator_name,t.anonymous,t.source_url
        FROM media_assets a JOIN media_attribution t ON t.asset_id=a.id
        WHERE a.deleted_at IS NULL AND a.id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(placements.map(item=>item.assetId))).all<{id:string;width:number;height:number;alt_text:string;required_credit:string;creator_name:string;anonymous:number;source_url:string}>();
    const images:Record<string,StudioImage>={};
    for(const item of placements){const a=rows.results.find(row=>row.id===item.assetId);if(a)images[item.placement]={assetId:a.id,src:`/control/media/${a.id}/preview`,cardSrc:`/control/media/${a.id}/preview`,width:a.width,height:a.height,alt:a.alt_text,creator:a.anonymous?'':a.creator_name,requiredCredit:a.required_credit,source:a.source_url};}
    return images;
}
const hash = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(b).buffer))).map(v => v.toString(16).padStart(2, '0')).join('');
/** One derivative cache for every content type; originals are never served. */
export async function studioDerivative(env: MediaEnvironment, assetId: string, authorizedAt=Date.now()) {
    if (!env.CONTENT_DB || !env.MEDIA_BUCKET)
        throw new MediaError('Media storage is unavailable.', 503);
    const db = env.CONTENT_DB, bucket = env.MEDIA_BUCKET;
    const asset = await db.prepare('SELECT * FROM media_assets WHERE id=? AND deleted_at IS NULL').bind(assetId).first<{
        id: string;
        sha256: string;
        original_key: string;
        publication_blocked: number;release_invalidated_at?:number;public_release_after?:number;
        rights_expires_at: number | null;
    }>();
    if (!asset || asset.publication_blocked || (asset.rights_expires_at !== null && asset.rights_expires_at <= Date.now()))
        throw new MediaError('This image is unavailable or has unresolved licence restrictions.', 409);
    if(Math.max(asset.release_invalidated_at||0,asset.public_release_after||0)>=authorizedAt)throw new MediaError('This image needs a new publication release after its rights were restored.',409);
    let derivative = await db.prepare('SELECT * FROM media_editorial_derivatives WHERE asset_id=? AND source_sha=?').bind(assetId, asset.sha256).first<Derivative>();
    if (!derivative) {
        const original = await bucket.get(asset.original_key);
        if (!original)
            throw new MediaError('Image bytes are unavailable.', 409);
        const bytes = new Uint8Array(await original.arrayBuffer());
        if (await hash(bytes) !== asset.sha256)
            throw new MediaError('Image integrity check failed.', 409);
        const { PhotonImage, resize, SamplingFilter } = await import('@cf-wasm/photon');
        const decoded = PhotonImage.new_from_byteslice(bytes), out = [];
        try {
            for (const size of [480, 1280]) {
                const ratio = Math.min(1, size / Math.max(decoded.get_width(), decoded.get_height())), width = Math.max(1, Math.round(decoded.get_width() * ratio)), height = Math.max(1, Math.round(decoded.get_height() * ratio));
                const image = resize(decoded, width, height, SamplingFilter.Triangle);
                try {
                    const data = image.get_bytes();
                    if (data.length > 8 * 1024 * 1024)
                        throw new MediaError('Prepared image is too large.');
                    out.push({ data, width, height });
                }
                finally {
                    image.free();
                }
            }
        }
        finally {
            decoded.free();
        }
        const id = crypto.randomUUID(), card = `private/editorial/${id}/card.png`, detail = `private/editorial/${id}/detail.png`;
        await bucket.put(card, out[0].data, { httpMetadata: { contentType: 'image/png' } });
        await bucket.put(detail, out[1].data, { httpMetadata: { contentType: 'image/png' } });
        await db.prepare('INSERT INTO media_editorial_derivatives(id,asset_id,source_sha,card_key,detail_key,card_sha,detail_sha,card_width,card_height,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, assetId, asset.sha256, card, detail, await hash(out[0].data), await hash(out[1].data), out[0].width, out[0].height, out[1].width, out[1].height, Date.now()).run().catch(async () => { if (!await db.prepare('SELECT id FROM media_editorial_derivatives WHERE asset_id=? AND source_sha=?').bind(assetId, asset.sha256).first())
            throw new MediaError('Image preparation failed.', 409); });
        derivative = await db.prepare('SELECT * FROM media_editorial_derivatives WHERE asset_id=? AND source_sha=?').bind(assetId, asset.sha256).first<Derivative>();
    }
    if (!derivative)
        throw new MediaError('Image preparation failed.', 409);
    for (const [key, checksum] of [[derivative.card_key, derivative.card_sha], [derivative.detail_key, derivative.detail_sha]]) {
        const object = await bucket.get(key);
        if (!object || await hash(new Uint8Array(await object.arrayBuffer())) !== checksum)
            throw new MediaError('Prepared image is unavailable.', 409);
    }
    return derivative;
}
type Derivative = {
    id: string;
    card_key: string;
    detail_key: string;
    card_sha: string;
    detail_sha: string;
    width: number;
    height: number;
    card_width: number;
    card_height: number;
};
export async function studioImages(db: D1Database, documentId: string, revision: number, releaseId?: string) {
    const rows = await db.prepare(`SELECT m.*,a.*,(SELECT created_at FROM studio_releases WHERE id=?) release_created_at,t.creator_name,t.anonymous,t.source_url FROM studio_media_references m JOIN media_assets a ON a.id=m.asset_id AND a.deleted_at IS NULL LEFT JOIN media_attribution t ON t.asset_id=a.id WHERE m.document_id=? AND m.revision=? AND a.publication_blocked=0 AND (a.rights_expires_at IS NULL OR a.rights_expires_at>unixepoch()*1000) AND (? IS NULL OR EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=? AND r.created_at>a.release_invalidated_at))`).bind(releaseId||null,documentId, revision,releaseId||null,releaseId||null).all<{
        asset_id: string;public_release_after?:number;release_created_at:number|null;
        placement: string;
        width: number;
        height: number;
        alt_text: string;
        required_credit: string;
        creator_name: string;
        anonymous: number;
        source_url: string;
    }>();
    const result: Record<string, StudioImage> = {};
    for (const row of rows.results) {
        if(releaseId&&(row.public_release_after||0)>=(row.release_created_at||0))continue;
        const base = releaseId ? `/media/studio/${releaseId}/${row.asset_id}` : `/control/media/${row.asset_id}/preview`;
        result[row.placement] = { assetId: row.asset_id, src: releaseId ? base + '/detail' : base, cardSrc: releaseId ? base + '/card' : base, width: row.width, height: row.height, alt: row.alt_text, creator: row.anonymous ? '' : row.creator_name || '', requiredCredit: row.required_credit, source: row.source_url || '' };
    }
    return result;
}
export async function deliverStudioImage(request: Request, env: MediaEnvironment, releaseId: string, assetId: string, variant: string) {
    const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin' };
    const missing = () => new Response(null, { status: 404, headers });
    if (!['GET', 'HEAD'].includes(request.method))
        return new Response(null, { status: 405, headers });
    if (!assetIdValid(assetId) || !assetIdValid(releaseId) || !['card', 'detail'].includes(variant) || new URL(request.url).search || !env.CONTENT_DB || !env.MEDIA_BUCKET)
        return missing();
    const eligible = async () => {const row=await env.CONTENT_DB!.prepare(`SELECT a.*,r.created_at release_created_at,d.card_key,d.detail_key,d.card_sha,d.detail_sha FROM studio_documents c JOIN studio_releases r ON r.id=c.live_release_id AND r.document_id=c.id JOIN studio_media_references m ON m.document_id=r.document_id AND m.revision=r.revision JOIN media_assets a ON a.id=m.asset_id JOIN media_editorial_derivatives d ON d.asset_id=a.id AND d.source_sha=a.sha256 WHERE r.id=? AND m.asset_id=? AND c.deleted_at IS NULL AND r.executed_at<=? AND a.deleted_at IS NULL AND a.publication_blocked=0 AND r.created_at>a.release_invalidated_at AND (a.rights_expires_at IS NULL OR a.rights_expires_at>unixepoch()*1000) LIMIT 1`).bind(releaseId, assetId, Date.now()).first<Derivative & {release_created_at:number;public_release_after?:number}>();return row&&(row.public_release_after||0)<row.release_created_at?row:null;};
    const row = await eligible();
    if (!row)
        return missing();
    const object = await env.MEDIA_BUCKET.get(variant === 'card' ? row.card_key : row.detail_key);
    if (!object)
        return missing();
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (await hash(bytes) !== (variant === 'card' ? row.card_sha : row.detail_sha) || !await eligible())
        return missing();
    return new Response(request.method === 'HEAD' ? null : bytes, { headers });
}
