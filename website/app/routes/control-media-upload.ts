import type { Route } from './+types/control-media-upload';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authorizeMedia, mediaFailure, mediaHeaders, uploadForm } from '../lib/media-access.server';
import { uploadMedia } from '../lib/media-db.server';
export async function action({request,context}: Route.ActionArgs) {
  try {
    const env=context.get(contentEnvironmentContext);
    const session=await authorizeMedia(request,env,true,import.meta.env.DEV);
    if(request.method!=='POST') return new Response('Method not allowed',{status:405,headers:mediaHeaders});
    const id=await uploadMedia(env,session,await uploadForm(request));
    return Response.json({id,message:'Image uploaded privately. Publication permissions remain unapproved.'},{status:201,headers:mediaHeaders});
  } catch(error) {
    const failure=mediaFailure(error);
    return Response.json({error:await failure.text()},{status:failure.status,headers:mediaHeaders});
  }
}
export function loader() { return new Response('Method not allowed',{status:405,headers:mediaHeaders}); }
