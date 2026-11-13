export const memorySlots = ['opening', 'history', 'collage1', 'collage2', 'collage3', 'collage4'] as const;
export type MemorySlot = typeof memorySlots[number];
export const collageSlots = ['opening', 'collage1', 'collage2', 'collage3', 'collage4'] as const;
export const memoryLabels: Record<MemorySlot,string> = {
 opening:'Community memories',history:'Shared worlds & moments',
 collage1:'Community memory 2',collage2:'Community memory 3',collage3:'Community memory 4',collage4:'Community memory 5',
};

/** Bound matches the existing 100-reference publication budget, not collage slots. */
export const MEMORY_PHOTO_LIMIT = 100;
export type MemoryPhoto = {id:string;assetId:string;alt:string;caption:string;placement:'collage'|'story';featured:boolean};
export function memoryPhotos(snapshot:{photos?:MemoryPhoto[];memories?:Partial<Record<MemorySlot,{assetId:string;alt:string}>>}):MemoryPhoto[] {
 if(Array.isArray(snapshot.photos))return snapshot.photos;
 return memorySlots.flatMap(id=>{const entry=snapshot.memories?.[id];return entry?[{id,...entry,caption:'',placement:id==='history'?'story' as const:'collage' as const,featured:id==='opening'}]:[];});
}
