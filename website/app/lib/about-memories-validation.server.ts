import {StudioError} from './content-studio.server.ts';
import {assetIdValid, type StudioSnapshot} from './studio-model.ts';
import {memorySlots,memoryLabels,type MemorySlot} from './about-memories.ts';

/** Fixed slots only. Never trust a submitted manifest or permit arbitrary placements. */
export function normalizeMemories(input: StudioSnapshot): StudioSnapshot {
  if (Object.keys(input).some(key => !['title','body_text','memories','media','scheduleInput'].includes(key)) || input.title !== 'About memories' || input.body_text !== '')
    throw new StudioError('Use the two About Memories image slots.');
  const raw = input.memories ?? {};
  if (typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !memorySlots.includes(key as MemorySlot)))
    throw new StudioError('Choose an opening or history image.');
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
  for (const slot of memorySlots) {
    const entry = snapshot.memories?.[slot];
    if (entry && (entry.alt.length < 5 || /^(?:image|photo|picture|screenshot|test|untitled)(?:\s*\d+)?\.?$/i.test(entry.alt) || /^https?:\/\//i.test(entry.alt)))
      throw new StudioError(`Describe what is in ${memoryLabels[slot]} before publishing.`,400);
  }
}
