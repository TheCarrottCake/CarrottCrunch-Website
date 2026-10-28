import {data} from 'react-router';
import type {Route} from './+types/gallery';
import {publicMeta,EditorialHeader} from '../components/public-page';
import {publicPages} from '../content/public-pages';
import {contentEnvironmentContext} from '../lib/cloudflare-context.server';
import {studioPublic} from '../lib/studio.server';
import {studioImages} from '../lib/studio-media.server';
import {PublicGallery} from '../components/public-gallery';
export function meta(){return publicMeta(publicPages.gallery);}
export function headers(){return {'Cache-Control':'no-store'};}
export async function loader({context}:Route.LoaderArgs){const db=context.get(contentEnvironmentContext).CONTENT_DB;if(!db)return data({entry:null,images:{}},{headers:headers()});const entry=(await studioPublic(db,'gallery',1))[0]||null;return data({entry,images:entry?await studioImages(db,entry.id,entry.revision,entry.release_id):{}},{headers:headers()});}
export default function Gallery({loaderData:d}:Route.ComponentProps){return <div className="v3-container v3-page v3-gallery"><EditorialHeader title="Community Creations" eyebrow={publicPages.gallery.eyebrow} description={publicPages.gallery.description}/>{d.entry ? <PublicGallery snapshot={d.entry.snapshot} images={d.images}/> : <p className="content-empty" role="status">No community screenshots are published here yet.</p>}</div>;}
