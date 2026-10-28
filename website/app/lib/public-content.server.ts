import type {CommunityHeroSlide} from './community-hero';
import {studioPublic} from './studio.server';
import {studioImages} from './studio-media.server';
import { isContentDemonstration } from './content-demo';
import type { RouterContextProvider } from 'react-router';
import { contentEnvironmentContext } from './cloudflare-context.server';
import { getPublishedAnnouncements, getPublishedEvents } from './content-db.server';

export function publicContentSource(context: Readonly<RouterContextProvider>) {
  const env = context.get(contentEnvironmentContext);
  // Vite production builds cannot enable fictional content, even with this binding set.
  const demonstration = isContentDemonstration(env.CONTENT_DEMO_MODE, import.meta.env.DEV);
  return { db: env.CONTENT_DB, demonstration };
}

export async function loadPublicContent(context: Readonly<RouterContextProvider>, homepage = false) {
  const { db, demonstration } = publicContentSource(context);
  const now = Date.now();
  const empty = { announcements: [], events: [], now, demonstration, showcase:[] as (CommunityHeroSlide & {label:string;theme:string})[], banners:[] as {id:string;title:string;description:string;link:string;linkText:string;image:string;width:number;height:number;alt:string;credit:string;creditSource:string}[] };
  if (!db) return { ...empty, availability: 'unconfigured' as const };
  try {
    const [announcements, events] = await Promise.all([
      getPublishedAnnouncements(db, now, homepage ? 3 : 100, { demonstration }),
      getPublishedEvents(db, now, homepage ? 3 : 100, { demonstration, upcomingOnly: homepage }),
    ]);
    const showcase=[] as typeof empty.showcase,banners=[] as typeof empty.banners;
    for(const kind of ['homepage','banners'] as const){const row=(await studioPublic(db,kind,1))[0];if(row){const images=await studioImages(db,row.id,row.revision,row.release_id);for(const item of row.snapshot.items||[]){const image=images[item.id];if(!item.enabled||!image)continue;if(kind==='homepage')showcase.push({id:item.id,width:image.width,height:image.height,label:item.title||'CARROTTCRUNCH',title:item.title,text:item.description,theme:'community',image:image.src,alt:item.alt||item.title||'CarrottCrunch community image',link:item.link,linkText:item.linkText,credit:image.requiredCredit,creditSource:image.source});else banners.push({...item,image:image.src,width:image.width,height:image.height,alt:item.alt||item.title||'CarrottCrunch banner',credit:image.requiredCredit,creditSource:image.source});}}}
    return { announcements, events, now, demonstration, showcase, banners, availability: 'ready' as const };
  } catch {
    // Never serialize database errors, SQL, bindings, or private content to visitors.
    console.error('Public content query failed');
    return { ...empty, availability: 'unavailable' as const };
  }
}
