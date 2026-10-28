import {studioPublic} from './studio.server.ts';
import {studioImages} from './studio-media.server.ts';
import {memorySlots, type MemorySlot} from './about-memories.ts';
import type {StudioImage} from './studio-model.ts';

/** Only the exact live revision; never hydrate a working revision on a public route. */
export async function publicAboutMemories(db?: D1Database): Promise<Partial<Record<MemorySlot,StudioImage>>> {
  if(!db)return {};
  const [release]=await studioPublic(db,'about-memories',1);
  if(!release)return {};
  const images=await studioImages(db,release.id,release.revision,release.release_id);
  const result: Partial<Record<MemorySlot,StudioImage>>={};
  for(const slot of memorySlots){
    const entry=release.snapshot.memories?.[slot], image=images[`memory:${slot}`];
    if(entry?.alt && image?.assetId === entry.assetId)result[slot]={...image,alt:entry.alt};
  }
  return result;
}
