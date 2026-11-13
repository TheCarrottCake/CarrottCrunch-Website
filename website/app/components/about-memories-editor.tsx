import {safeContentHref} from './content-body';
import type {StudioSnapshot,StudioImage} from '../lib/studio-model';
import {memoryPhotos,type MemoryPhoto} from '../lib/about-memories';
import {StudioCollectionManager} from './studio-collection-manager';
import type {PickerAsset} from './studio-media-picker';
export function AboutMemoriesPreview({snapshot,images}:{snapshot:StudioSnapshot;images:Record<string,StudioImage>}){
 const selected=memoryPhotos(snapshot).filter(p=>images[`memory:${p.id}`]?.assetId===p.assetId),collage=selected.filter(p=>p.placement==='collage').sort((a,b)=>Number(b.featured)-Number(a.featured)),story=selected.find(p=>p.placement==='story');
 const preview=(p:MemoryPhoto)=>{const image=images[`memory:${p.id}`],source=safeContentHref(image.source);return <figure className="studio-memory-preview" key={p.id}><img src={image.src} alt={p.alt} width={image.width} height={image.height}/>{(p.caption||image.requiredCredit)&&<figcaption>{p.caption} {image.requiredCredit}{image.requiredCredit&&source&&<> <a href={source} rel="noreferrer">Source</a></>}</figcaption>}</figure>;};
 return <section aria-label="About Memories preview" className="studio-about-memories"><p>Private working collection preview. Empty positions stay hidden.</p>{!selected.length?<p>No photos selected.</p>:<>{collage.length>0&&<div className="studio-memory-collage" data-count={collage.length}>{collage.map(preview)}</div>}{story&&<section><h2>Smaller story image</h2>{preview(story)}</section>}</>}</section>;
}
export function AboutMemoriesFields({snapshot,images,csrf,onChange,onImage,onBusy}:{snapshot:StudioSnapshot;images:Record<string,StudioImage>;csrf:string;onChange:(photos:MemoryPhoto[])=>void;onImage:(asset:PickerAsset,placement:string)=>void;onBusy:(busy:boolean)=>void}){
 const photos=memoryPhotos(snapshot);
 return <StudioCollectionManager items={photos.map(p=>({...p,title:p.caption,description:'',link:'',linkText:'',enabled:true}))} images={images} kind="about-memories" csrf={csrf} onBusy={onBusy} onImage={onImage} onChange={items=>onChange(items.map(p=>({id:p.id,assetId:p.assetId,alt:p.alt,caption:p.title,placement:p.placement||'collage',featured:p.featured})))}/>;
}
