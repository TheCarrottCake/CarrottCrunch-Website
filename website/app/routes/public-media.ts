import type { Route } from './+types/public-media';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { deliverEditorialImage } from '../lib/editorial-media.server';
import { deliverStudioImage } from '../lib/studio-media.server';
export async function loader({request,context,params}:Route.LoaderArgs) {
 try{const env=context.get(contentEnvironmentContext);const legacy=env.CONTENT_DB?await env.CONTENT_DB.prepare('SELECT l.content_id FROM content_releases l WHERE l.id=?').bind(params.releaseId).first<{content_id:string}>():null;
 if(legacy&&await env.CONTENT_DB!.prepare('SELECT id FROM studio_documents WHERE id=?').bind(legacy.content_id).first()){
  const image=await env.CONTENT_DB!.prepare('SELECT i.asset_id FROM media_editorial_images i JOIN content_revision_media m ON m.image_id=i.id JOIN studio_releases r ON r.document_id=m.content_id AND r.revision=m.revision WHERE i.id=? AND r.id=?').bind(params.imageId,params.releaseId).first<{asset_id:string}>();
  if(!image)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  return deliverStudioImage(request,env,params.releaseId,image.asset_id,params.variant);
 }
 return await deliverEditorialImage(request,env,params.releaseId,params.imageId,params.variant);}
 catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
}
