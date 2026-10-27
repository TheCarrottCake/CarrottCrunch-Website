import {useEffect,useId,useRef,useState} from 'react';
import {useFetcher} from 'react-router';
import type {loader,action} from '../routes/control-media-picker';
import type {FeaturedImage} from '../lib/featured-image';
import {FeaturedImageView} from './featured-image';
import {ContentImageUpload,PendingImageReview} from './content-image-upload';
import type {PendingContentImage} from '../lib/content-image-upload.server';

export function FeaturedImageField({value='',pendingId='',onChange,onPendingChange,onBusyChange,role='Moderator',csrf,error}:{value?:string;pendingId?:string;onChange:(id:string)=>void;onPendingChange?:(id:string)=>void;onBusyChange?:(busy:boolean)=>void;role?:string;csrf:string;error?:string}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[mime,setMime]=useState(''),[selected,setSelected]=useState('');
 const [preview,setPreview]=useState<FeaturedImage|null>(null),[loadError,setLoadError]=useState('');
 const [pending,setPending]=useState<PendingContentImage|null>(null);
 const [imageWorking,setImageWorking]=useState(false);
 const busyChange=(working:boolean)=>{setImageWorking(working);onBusyChange?.(working);};
 const list=useFetcher<typeof loader>(),prepare=useFetcher<typeof action>(),current=useFetcher<typeof loader>();
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null),requestActive=useRef(false),heading=useId();
 const items=list.data&&'items' in list.data?list.data.items:[];
 const choice=items.find(i=>i.assetId===selected),busy=prepare.state!=='idle';
 const load=(offset=0)=>{list.load(`/control/media/picker?${new URLSearchParams({q:query,type:mime,offset:String(offset)})}`);};
 useEffect(()=>{if(!value){setPreview(null);return;}current.load(`/control/media/picker?imageId=${encodeURIComponent(value)}`);},[value]);
 useEffect(()=>{if(current.data&&'image' in current.data&&current.data.image?.id===value)setPreview(current.data.image);},[current.data,value]);
 useEffect(()=>{if(open){dialog.current?.showModal();search.current?.focus();}else if(dialog.current?.open)dialog.current.close();},[open]);
 useEffect(()=>{
  if(prepare.state==='idle'&&prepare.data&&requestActive.current){
   requestActive.current=false;
   if('image' in prepare.data&&prepare.data.image){setPreview(prepare.data.image);onChange(prepare.data.image.id);setOpen(false);}
   else if('message' in prepare.data)setLoadError(prepare.data.message);
  }
 },[prepare.state,prepare.data]);
 useEffect(()=>{if(!pendingId){setPending(null);return;}const abort=new AbortController();fetch(`/control/content-image?id=${encodeURIComponent(pendingId)}`,{credentials:'same-origin',signal:abort.signal}).then(r=>r.json() as Promise<{pending?:PendingContentImage}>).then(r=>setPending(r.pending||null)).catch(()=>{});return ()=>abort.abort();},[pendingId]);
 const close=()=>{requestActive.current=false;setOpen(false);};
 return <section className="featured-image-field" aria-labelledby={`${heading}-label`}>
  <h3 id={`${heading}-label`}>Featured image <span className="muted">(optional)</span></h3>
  <input type="hidden" name="featuredImageId" value={value}/>
  <input type="hidden" name="pendingImageId" value={pendingId}/>
  {pending?.id===pendingId&&<PendingImageReview key={pending.id} image={pending} csrf={csrf} onBusyChange={busyChange} canApprove={role==='Administrator'||role==='Owner'} onApproved={image=>{setPreview(image);onChange(image.id);}}/>}
  {value&&preview?.id===value?<FeaturedImageView key={preview.id} image={preview} privatePreview/>:value?<p role="status">{current.state!=='idle'?'Loading selected image…':'Selected image unavailable. Replace or remove it.'}</p>:!pendingId&&<p className="muted">Upload below, or reuse an image from the Library.</p>}
  {error&&<p role="alert" className="studio-field-error">{error}</p>}
  <ContentImageUpload pendingId={pendingId||value} csrf={csrf} disabled={imageWorking} onBusyChange={busyChange} onPending={image=>{setPending(image);onPendingChange?.(image.id);setPreview(null);}}/>
  <div className="studio-actions"><button type="button" className="button secondary" ref={trigger} disabled={imageWorking} aria-haspopup="dialog" onClick={()=>{setSelected('');setLoadError('');setOpen(true);load();}}>Choose from Library</button>
  {(value||pendingId)&&<button type="button" className="button secondary" disabled={imageWorking} onClick={()=>{setPreview(null);onChange('');onPendingChange?.('');trigger.current?.focus();}}>Remove image</button>}</div>
  <dialog className="media-picker" ref={dialog} aria-labelledby={`${heading}-title`} onCancel={close} onClose={()=>{setOpen(false);trigger.current?.focus();}} onKeyDown={e=>{
   if(e.key!=='Tab')return;
   const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([type=hidden]),select,a[href]'));
   const first=controls[0],last=controls.at(-1),focused=document.activeElement;
   if(e.shiftKey&&(focused===first||!controls.includes(focused as HTMLElement))){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&(focused===last||!controls.includes(focused as HTMLElement))){e.preventDefault();first?.focus();}
  }}>
   {open&&<><h2 id={`${heading}-title`}>Choose a featured image</h2><p className="muted">Editorial approval covers announcements, events, cards and same-site homepage teasers.</p>
   <div className="media-picker-search"><label htmlFor={`${heading}-search`}>Search images</label><input id={`${heading}-search`} ref={search} type="search" maxLength={160} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setSelected('');load();}}}/>
   <label htmlFor={`${heading}-type`}>Image type</label><select id={`${heading}-type`} value={mime} onChange={e=>setMime(e.target.value)}><option value="">All types</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select>
   <button className="button secondary" type="button" disabled={list.state!=='idle'} onClick={()=>{setSelected('');load();}}>Search</button></div>
   <p role="status">{list.state!=='idle'?'Loading images…':!items.length?'No matching images. Try another search or check the Media Library.':`${items.length} images on this page. Images without editorial approval cannot be selected.`}</p>
   <div className="media-picker-grid">{items.map(item=><button type="button" className="media-picker-option" key={item.assetId} aria-pressed={selected===item.assetId} aria-disabled={!item.eligible||busy} onClick={()=>{if(item.eligible&&!busy)setSelected(item.assetId);}}>
    <img src={item.thumbnail} alt="" width={item.width} height={item.height} loading="lazy"/><strong>{item.title}</strong><span>{item.eligible?'Eligible for editorial use':item.reasons.join(' ')}</span>
   </button>)}</div>
   {choice&&<div className="media-picker-details"><strong>{choice.title}</strong><p>Alt text: {choice.alt}</p><p>Creator: {choice.creator}{choice.source&&<> · <a href={choice.source} rel="noreferrer">Source</a></>}</p><p>Changing library metadata later will not alter this saved image presentation.</p></div>}
   {list.data&&'offset' in list.data&&<nav className="studio-actions" aria-label="Image pages">{list.data.offset>0&&<button type="button" className="button secondary" onClick={()=>{setSelected('');load(Math.max(0,(list.data&&'offset' in list.data?list.data.offset:0)-24));}}>Previous images</button>}{list.data.more&&<button type="button" className="button secondary" onClick={()=>{setSelected('');load((list.data&&'offset' in list.data?list.data.offset:0)+24);}}>More images</button>}</nav>}
   {list.data&&'message' in list.data&&<p className="studio-field-error" role="alert">{String(list.data.message||'')}</p>}
   {loadError&&<p className="studio-field-error" role="alert">{loadError}</p>}
   <div className="media-picker-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button type="button" className="button primary" disabled={!choice?.eligible||busy} onClick={()=>{
    if(!choice||!choice.eligible)return;requestActive.current=true;setLoadError('');prepare.submit({_csrf:csrf,assetId:choice.assetId,version:String(choice.version),grantId:choice.grantId},{method:'post',action:'/control/media/picker'});
   }}>{busy?'Preparing image…':'Select image'}</button></div></>}
  </dialog>
 </section>;
}

export function PrivateFeaturedPreview({value}:{value?:string}){
 const current=useFetcher<typeof loader>();
 useEffect(()=>{if(value)current.load(`/control/media/picker?imageId=${encodeURIComponent(value)}`);},[value]);
 const image=current.data&&'image' in current.data?current.data.image:null;
 return image && image.id===value?<FeaturedImageView key={image.id} image={image} privatePreview/>:null;
}
