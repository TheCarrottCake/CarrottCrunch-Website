import {useState} from 'react';
import type {StudioImage} from '../lib/studio-model';
import {isPublicHeroImage} from '../lib/community-hero';
import {safeContentHref} from './content-body';
import {FullImageDialog} from './full-image-dialog';

export function AboutMemory({label,className='',image}: {label:string;className?:string;image?:StudioImage}) {
  const [failed,setFailed]=useState('');
  const available=!!image && failed!==image.src && isPublicHeroImage(image.src);
  const source=image?.source ? safeContentHref(image.source) : null;
  return <figure className={`v3-memory-slot ${className}`}>
    {available ? <div className="v3-memory-canvas v3-memory-canvas--image"><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" onError={()=>setFailed(image.src)}/></div> :
      <div className="v3-memory-canvas" aria-hidden="true"><span>▧</span><span className="v3-memory-corner">+</span></div>}
    <figcaption><strong>{label}</strong>{available ? <>
      {image.requiredCredit && <span>{image.requiredCredit}{source && <> · <a href={source} rel="noreferrer">Source</a></>}</span>}
      <FullImageDialog variant="gallery" triggerLabel={`View full image: ${label}`} image={{id:image.assetId,image:image.src,alt:image.alt,title:label,width:image.width,height:image.height,credit:image.requiredCredit,creditSource:image.requiredCredit?image.source:'',text:'',link:'',linkText:''}}/>
    </> : <span>Awaiting a real historical image.</span>}</figcaption>
  </figure>;
}
