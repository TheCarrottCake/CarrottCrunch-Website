import {useState,type CSSProperties} from 'react';
import type {StudioImage} from '../lib/studio-model';
import {memoryLabels,type MemorySlot} from '../lib/about-memories';
import {isPublicHeroImage} from '../lib/community-hero';
import {safeContentHref} from './content-body';
import {FullImageDialog} from './full-image-dialog';

export function AboutMemory({label,className='',image,onUnavailable}: {label:string;className?:string;image?:StudioImage;onUnavailable?:()=>void}) {
 const [failed,setFailed]=useState('');
 if(!image||failed===image.src||!isPublicHeroImage(image.src))return null;
 const source=image.source?safeContentHref(image.source):null;
 const small=image.width>0&&image.height>0&&(image.width<480||image.height<240);
 const style=small?{'--memory-small-ratio':`${image.width} / ${image.height}`,maxInlineSize:`calc(${image.width}px + 1.5rem + 2px)`} as CSSProperties:undefined;
 return <figure className={`v3-memory-slot ${className}`} data-small={small} style={style}>
  <div className="v3-memory-canvas v3-memory-canvas--image"><FullImageDialog variant="gallery" triggerLabel={`View full image: ${label}`} image={{id:image.assetId,image:image.src,alt:image.alt,title:label,width:image.width,height:image.height,credit:image.requiredCredit,creditSource:image.requiredCredit?image.source:'',text:'',link:'',linkText:''}}><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" onError={()=>{setFailed(image.src);onUnavailable?.();}}/></FullImageDialog></div>
  <figcaption><strong>{label}</strong>{image.requiredCredit&&<span>{image.requiredCredit}{source&&<> &#183; <a href={source} rel="noreferrer">Source</a></>}</span>}</figcaption>
 </figure>;
}
export function AboutMemoryCollage({images}: {images:Record<string,StudioImage & {caption?:string;placement?:string;featured?:boolean}>}) {
 const [failed,setFailed]=useState<ReadonlySet<string>>(()=>new Set());
 const slots=Object.keys(images).filter(slot=>{const image=images[slot];return image&&(image.placement?image.placement!=='story':slot!=='history')&&isPublicHeroImage(image.src)&&!failed.has(image.src);}).sort((a,b)=>Number(!!images[b]?.featured)-Number(!!images[a]?.featured));
 if(!slots.length)return null;
 return <div className="v3-memory-collage" data-count={slots.length} role="group" aria-label="Historical community memories">{slots.map(slot=><AboutMemory key={`${slot}:${images[slot]!.src}`} image={images[slot]} label={images[slot]?.caption || memoryLabels[slot as MemorySlot] || "Community memory"} className={`v3-memory-slot--${slot}`} onUnavailable={()=>setFailed(current=>new Set([...current,images[slot]!.src]))}/>)}</div>;
}
