import {data} from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;actionData?:LegacyData<Awaited<ReturnType<typeof action>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
import {contentEnvironmentContext} from '../lib/cloudflare-context.server';
import {authorizeMedia,mediaFailure,mediaHeaders,metadataForm} from '../lib/media-access.server';
import {listMedia,requireMediaStorage,MediaError} from '../lib/media-db.server';
import {editorialGrant,editorialReadiness,prepareEditorialImage,privateFeaturedImage} from '../lib/editorial-media.server';

export async function loader({request,context}:Route.LoaderArgs){try{
 const env=context.get(contentEnvironmentContext);await authorizeMedia(request,env,false,import.meta.env.DEV);
 const {db}=requireMediaStorage(env),q=new URL(request.url).searchParams;
 if(q.has('imageId'))return data({image:await privateFeaturedImage(db,q.get('imageId'))},{headers:mediaHeaders});
 const search=q.get('q')||'',offset=Number(q.get('offset')||0),mime=q.get('type')||'';
 if(search.length>160)throw new MediaError('Use a search of at most 160 characters.');
 const rows=await listMedia(db,search,false,offset,mime);
 const items=await Promise.all(rows.slice(0,24).map(async asset=>{
  const grant=await editorialGrant(db,asset.id),ready=editorialReadiness(asset,grant);
  return {assetId:asset.id,version:asset.version,grantId:grant?.id||'',title:asset.title,alt:asset.alt_text,
   creator:asset.anonymous?'Anonymous creator':asset.creator_name,source:asset.source_url,width:asset.width,height:asset.height,
   thumbnail:`/control/media/${asset.id}/preview`,...ready};
 }));
 return data({items,more:rows.length>24,offset},{headers:mediaHeaders});
 }catch(error){const failure=mediaFailure(error);return data({items:[],more:false,offset:0,message:await failure.text()},{status:failure.status,headers:mediaHeaders});}}
export async function action({request,context}:Route.ActionArgs){try{
 const env=context.get(contentEnvironmentContext),session=await authorizeMedia(request,env,true,import.meta.env.DEV);
 if(request.method!=='POST')throw new MediaError('Method not allowed.',405);
 const f=await metadataForm(request);
 if(['assetId','version','grantId','_csrf'].some(k=>f.getAll(k).length!==1)||!/^\d+$/.test(String(f.get('version'))))throw new MediaError('Use the supplied image selection.');
 const image=await prepareEditorialImage(env,String(f.get('assetId')),Number(f.get('version')),String(f.get('grantId')),session.discord_user_id);
 return data({image},{headers:mediaHeaders});
 }catch(error){const failure=mediaFailure(error);return data({message:await failure.text()},{status:failure.status,headers:mediaHeaders});}}
