import {useState} from 'react';
import type {FeaturedImage} from '../lib/featured-image';
export function FeaturedImageView({image,compact=false,privatePreview=false}:{image?:FeaturedImage|null;compact?:boolean;privatePreview?:boolean}){
 const [failed,setFailed]=useState(false);
 if(!image)return null;
 return <figure className={`featured-image${compact?' featured-image--card':''}`}>
  {failed?<p className="muted">Image unavailable.</p>:<img src={compact?image.cardSrc:image.src} alt={image.alt} width={compact?image.cardWidth:image.width} height={compact?image.cardHeight:image.height} loading={compact?'lazy':'eager'} decoding="async" onError={()=>setFailed(true)}/>}
  {(image.requiredCredit||privatePreview)&&<figcaption>{image.requiredCredit||''}{image.requiredCredit&&image.source&&<> · <a href={image.source} rel="noreferrer">Source</a></>}{privatePreview&&<><br/><span>Alt text: {image.alt}</span><br/>{image.available?<span className="media-selection-ready">Eligible for editorial use. Content approval is still required.</span>:<strong className="studio-field-error">Unavailable for publication. Replace or remove this image.</strong>}</>}</figcaption>}
 </figure>;
}
