import {studioPublic} from './studio.server.ts';
import {studioImages} from './studio-media.server.ts';
import {memoryPhotos} from './about-memories.ts';
import type {StudioImage} from './studio-model.ts';

export type PublicMemoryImage = StudioImage & {caption?:string;placement?:'collage'|'story';featured?:boolean};

/** Only the exact live revision; never hydrate a working revision on a public route. */
export async function publicAboutMemories(db?: D1Database): Promise<Record<string,PublicMemoryImage>> {
  if(!db)return {};
  const [release]=await studioPublic(db,'about-memories',1);
  if(!release)return {};
  const images=await studioImages(db,release.id,release.revision,release.release_id);
  const result: Record<string,PublicMemoryImage>={};
  for(const entry of memoryPhotos(release.snapshot)){
    const image=images[`memory:${entry.id}`];
    if(entry.alt && image?.assetId === entry.assetId)result[entry.id]={...image,alt:entry.alt,caption:entry.caption,placement:entry.placement,featured:entry.featured};
  }
  return result;
}
