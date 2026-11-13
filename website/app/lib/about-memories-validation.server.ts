import {StudioError} from './content-studio.server.ts';
import {assetIdValid, type StudioSnapshot} from './studio-model.ts';
import {memorySlots,memoryLabels,memoryPhotos,MEMORY_PHOTO_LIMIT,type MemorySlot} from './about-memories.ts';

/** Derive every media reference server-side; retain legacy revisions unchanged. */
export function normalizeMemories(input: StudioSnapshot): StudioSnapshot {
  if (Object.keys(input).some(key => !['title','body_text','memories','photos','media','scheduleInput'].includes(key)) || input.title !== 'About memories' || input.body_text !== '')
    throw new StudioError('Use the About Memories photo collection.');
  if(input.photos !== undefined){
    if(input.memories !== undefined || !Array.isArray(input.photos) || input.photos.length>MEMORY_PHOTO_LIMIT || new TextEncoder().encode(JSON.stringify(input)).length>256*1024)throw new StudioError('Use up to 100 photos and a collection payload below 256 KB.');
    const seen=new Set<string>();
    const photos=input.photos.map(photo=>{
      if(!photo||typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(k=>!['id','assetId','alt','caption','placement','featured'].includes(k))||typeof photo.id!=='string'||(!assetIdValid(photo.id)&&!memorySlots.includes(photo.id as MemorySlot))||seen.has(photo.id)||typeof photo.assetId!=='string'||!assetIdValid(photo.assetId)||typeof photo.alt!=='string'||photo.alt.length>1000||typeof photo.caption!=='string'||photo.caption.length>300||/[\u0000-\u001f\u007f]/.test(photo.alt+photo.caption)||!['collage','story'].includes(photo.placement)||typeof photo.featured!=='boolean'||photo.placement==='story'&&photo.featured)throw new StudioError('Check each photo, caption, description and placement.');
      seen.add(photo.id);return {...photo,alt:photo.alt.trim(),caption:photo.caption.trim()};
    });
    if(photos.filter(p=>p.placement==='story').length>1||photos.filter(p=>p.featured).length>1)throw new StudioError('Choose one featured collage photo and at most one story photo.');
    return {title:'About memories',body_text:'',photos,media:photos.map(p=>({placement:`memory:${p.id}`,assetId:p.assetId,alt:p.alt}))};
  }
  const raw = input.memories ?? {};
  if (typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !memorySlots.includes(key as MemorySlot)))
    throw new StudioError('Choose a supported About Memories slot.');
  const memories: NonNullable<StudioSnapshot['memories']> = {}, media: NonNullable<StudioSnapshot['media']> = [];
  for (const slot of memorySlots) {
    if (!Object.hasOwn(raw,slot)) continue;
    const entry = raw[slot];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => !['assetId','alt'].includes(key)) || typeof entry.assetId !== 'string' || !assetIdValid(entry.assetId) || typeof entry.alt !== 'string' || entry.alt.length > 1000 || /[\u0000-\u001f\u007f]/.test(entry.alt))
      throw new StudioError(`Check the ${memoryLabels[slot]} image and description.`);
    memories[slot] = {assetId:entry.assetId, alt:entry.alt.trim()};
    media.push({placement:`memory:${slot}`, ...memories[slot]!});
  }
  return {title:'About memories',body_text:'',memories,media};
}

export function validateMemoryRelease(input: StudioSnapshot) {
  const snapshot = normalizeMemories(input);
  for (const entry of memoryPhotos(snapshot)) {
    if (entry && (entry.alt.length < 5 || /^(?:image|photo|picture|screenshot|test|untitled)(?:\s*\d+)?\.?$/i.test(entry.alt) || /^https?:\/\//i.test(entry.alt)))
      throw new StudioError(`Describe what is in ${entry.caption || "this photo"} before publishing.`,400);
  }
}
