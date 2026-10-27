import {data} from 'react-router';
import type {Route} from './+types/gallery';
import {PublicPage,publicMeta} from '../components/public-page';
import {publicPages} from '../content/public-pages';
import {contentEnvironmentContext} from '../lib/cloudflare-context.server';
import {studioPublic} from '../lib/studio.server';
import {studioImages} from '../lib/studio-media.server';
import {StudioPreview} from '../components/studio-render';
export function meta(){return publicMeta(publicPages.gallery);}
export function headers(){return {'Cache-Control':'no-store'};}
export async function loader({context}:Route.LoaderArgs){const db=context.get(contentEnvironmentContext).CONTENT_DB;if(!db)return data({entry:null,images:{}},{headers:headers()});const entry=(await studioPublic(db,'gallery',1))[0]||null;return data({entry,images:entry?await studioImages(db,entry.id,entry.revision,entry.release_id):{}},{headers:headers()});}
export default function Gallery({loaderData:d}:Route.ComponentProps){return d.entry?<div className="container public-page"><header className="public-page-intro"><h1>Community Creations</h1></header><StudioPreview snapshot={{...d.entry.snapshot,items:[...(d.entry.snapshot.items||[])].sort((a,b)=>Number(b.featured)-Number(a.featured))}} images={d.images} kind="gallery"/></div>:<PublicPage content={publicPages.gallery}/>;}
