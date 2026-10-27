import {useEffect,useId,useRef,useState} from 'react';
import type {PendingContentImage} from '../lib/content-image-upload.server';
import type {FeaturedImage} from '../lib/featured-image';

export function PendingImageReview({image,canApprove=false,onApproved,csrf,onBusyChange}:{image:PendingContentImage;canApprove?:boolean;onApproved?:(image:FeaturedImage)=>void;csrf?:string;onBusyChange?:(busy:boolean)=>void}){
 const [reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <section className="pending-image-review" aria-label="Uploaded image review">
  <img src={image.src} alt={image.alt} width={image.width} height={image.height}/>
  <p><strong>Alt text:</strong> {image.alt}<br/><strong>Creator:</strong> {image.creator}{image.source&&<> · <a href={image.source} rel="noreferrer">Source</a></>}</p>
  <details><summary>Creator permission</summary><p>{image.evidence}</p>{image.conditions&&<p className="studio-field-error">Unresolved conditions: {image.conditions}</p>}</details>
  <p className="muted">Saved privately. An Administrator or Owner must review this image before publication.</p>
  {!image.available&&<p className="studio-field-error">This upload changed or is unavailable. Replace or remove it.</p>}
  {canApprove&&onApproved&&<>
   <label className="media-checkbox"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I reviewed the image and creator permission above.</label>
   <button type="button" className="button secondary" disabled={!reviewed||busy||!image.available||!!image.conditions} onClick={async()=>{
    if(busy)return;setBusy(true);onBusyChange?.(true);setMessage('');
    try{const response=await fetch('/control/content-image',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf||'','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id:image.id,previousGrantId:image.previousGrantId,confirm:'authorize'})});
     const result=await response.json() as {image?:FeaturedImage;message?:string};if(!response.ok||!result.image)throw new Error(result.message||'Image approval failed. Try again.');onApproved(result.image);
    }catch(error){setMessage(error instanceof Error?error.message:'Image approval failed.');}finally{setBusy(false);onBusyChange?.(false);}
   }}>{busy?'Preparing approved image…':'Approve image & use it'}</button>
   <p className="muted">This authorizes editorial image use. Save the new revision, then approve or publish the content with the top toolbar.</p>
  </>}
  {message&&<p role="alert" className="studio-field-error">{message}</p>}
 </section>;
}

export function ContentImageUpload({pendingId='',onPending,csrf,onBusyChange,disabled=false}:{pendingId?:string;onPending:(image:PendingContentImage)=>void;csrf:string;onBusyChange?:(busy:boolean)=>void;disabled?:boolean}){
 const id=useId(),input=useRef<HTMLInputElement>(null),controller=useRef<AbortController|null>(null),feedback=useRef<HTMLParagraphElement>(null);
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[alt,setAlt]=useState(''),[kind,setKind]=useState('own'),[owns,setOwns]=useState(false),[creator,setCreator]=useState(''),[evidence,setEvidence]=useState(''),[source,setSource]=useState(''),[conditions,setConditions]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dragging,setDragging]=useState(false);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return ()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const choose=(files:FileList|null)=>{
  if(busy||disabled)return;setMessage('');
  if(!files||files.length!==1){setMessage('Choose one image.');return;}
  if(files[0].size>20*1024*1024){setMessage('Choose an image of at most 20 MB.');return;}
  setFile(files[0]);setOwns(false);
 };
 return <section className="content-image-upload" aria-labelledby={`${id}-label`} onKeyDown={event=>{
  if(event.key==='Enter'&&event.target instanceof HTMLInputElement&&['text','url','checkbox'].includes(event.target.type))event.preventDefault();
 }}>
  <h4 id={`${id}-label`}>{pendingId?'Replace uploaded image':'Upload an image'}</h4>
  <div className={`image-dropzone${dragging?' is-dragging':''}`} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files);}}>
   <button type="button" className="button primary" disabled={busy||disabled} onClick={()=>input.current?.click()}>{file?'Choose another file':pendingId?'Replace image':'Choose a file'}</button><span>or drag an image here</span>
   <input hidden tabIndex={-1} aria-label="Image file" ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{choose(e.target.files);e.target.value='';}}/>
   <p className="muted">JPEG, PNG or WebP · up to 20 MB, 4096 pixels per side and 4 million pixels total.</p>
  </div>
  {file&&<fieldset disabled={busy||disabled} className="compact-image-fields"><legend>{file.name}</legend>
   {preview&&<img className="upload-local-preview" src={preview} alt={alt||'Selected image, not yet uploaded'}/>}
   <label htmlFor={`${id}-alt`}>Describe the image (alt text)</label><input id={`${id}-alt`} maxLength={1000} value={alt} onChange={e=>setAlt(e.target.value)}/>
   <label htmlFor={`${id}-rights`}>Who created it?</label><select id={`${id}-rights`} value={kind} onChange={e=>{setKind(e.target.value);setOwns(false);}}><option value="own">I created this image</option><option value="licensed">Someone else — I have permission or a licence</option></select>
   {kind==='own'?<label className="media-checkbox"><input type="checkbox" checked={owns} onChange={e=>setOwns(e.target.checked)}/> I created it and permit CarrottCrunch to use it in content and homepage teasers.</label>:<>
    <label htmlFor={`${id}-creator`}>Creator / credit</label><input id={`${id}-creator`} maxLength={160} value={creator} onChange={e=>setCreator(e.target.value)}/>
    <label htmlFor={`${id}-evidence`}>Permission or licence evidence</label><textarea id={`${id}-evidence`} maxLength={2000} rows={3} value={evidence} onChange={e=>setEvidence(e.target.value)}/>
   </>}
   <details><summary>Source and credit details</summary>{kind==='own'&&<label>Credit name (your display name by default)<input maxLength={160} value={creator} onChange={e=>setCreator(e.target.value)}/></label>}<label>Source link (optional, HTTPS)<input type="url" maxLength={2048} value={source} onChange={e=>setSource(e.target.value)}/></label><label>Unresolved creator conditions (if any)<textarea maxLength={2000} rows={2} value={conditions} onChange={e=>setConditions(e.target.value)}/></label></details>
   <div className="studio-actions"><button type="button" className="button primary" disabled={!alt.trim()||(kind==='own'?!owns:!creator.trim()||!evidence.trim())} onClick={async()=>{
    if(busy||controller.current)return;setBusy(true);onBusyChange?.(true);setMessage('');const abort=new AbortController();controller.current=abort;
    const body=new FormData();body.set('image',file);for(const [k,v]of Object.entries({alt,rightsKind:kind,owns:owns?'yes':'',creator,evidence,source,conditions}))body.set(k,v);
    try{const response=await fetch('/control/content-image',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf},body,signal:abort.signal});const result=await response.json() as {pending?:PendingContentImage;message?:string};
     if(!response.ok||!result.pending)throw new Error(result.message||'Upload failed. Please try again.');
     onPending(result.pending);setFile(null);setMessage('Uploaded privately. Save to attach it to this draft.');requestAnimationFrame(()=>feedback.current?.focus());
    }catch(error){setMessage(abort.signal.aborted?'Upload cancelled. The image may have reached the private Library; check there before retrying.':error instanceof Error?error.message:'Upload failed. Your content and previous image are unchanged.');}
    finally{controller.current=null;setBusy(false);onBusyChange?.(false);}
   }}>Upload image</button><button type="button" className="button secondary" onClick={()=>{setFile(null);setMessage('');}}>Cancel selection</button></div>
   <p className="muted">Upload first, then Save. The current draft image stays attached until this upload succeeds.</p>
  </fieldset>}
  {busy&&<div role="status">Uploading and validating image… <button type="button" className="button secondary" onClick={()=>controller.current?.abort()}>Cancel upload</button></div>}
  <p role="status" tabIndex={-1} ref={feedback}>{message}</p>
 </section>;
}

export function PendingImagePreview({id}:{id?:string}){
 const [image,setImage]=useState<PendingContentImage|null>(null);
 useEffect(()=>{if(!id){setImage(null);return;}const abort=new AbortController();fetch(`/control/content-image?id=${encodeURIComponent(id)}`,{credentials:'same-origin',signal:abort.signal}).then(r=>r.json() as Promise<{pending?:PendingContentImage}>).then(r=>setImage(r.pending||null)).catch(()=>{});return ()=>abort.abort();},[id]);
 return image?.id===id&&image?<PendingImageReview image={image}/>:null;
}
