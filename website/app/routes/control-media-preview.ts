import type { Route } from './+types/control-media-preview';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authorizeMedia, mediaFailure, mediaHeaders } from '../lib/media-access.server';
import { getMedia, requireMediaStorage } from '../lib/media-db.server';
export async function loader({request,context,params}: Route.LoaderArgs) {
  try {
    const env=context.get(contentEnvironmentContext);
    await authorizeMedia(request,env,false,import.meta.env.DEV);
    const {db,bucket}=requireMediaStorage(env);
    await getMedia(db,params.assetId);
    // Only the server resolves a key. No original download or arbitrary-key endpoint exists.
    const row=await db.prepare('SELECT preview_key FROM media_assets WHERE id=?').bind(params.assetId).first<{preview_key:string}>();
    const object=row && await bucket.get(row.preview_key);
    if(!object) return new Response('Preview unavailable',{status:404,headers:mediaHeaders});
    return new Response(object.body,{headers:{...mediaHeaders,'Content-Type':'image/png','Content-Disposition':`inline; filename="${params.assetId}.png"`,'Content-Security-Policy':"default-src 'none'; sandbox"}});
  } catch(error) { return mediaFailure(error); }
}
