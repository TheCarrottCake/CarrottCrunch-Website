import {useState} from 'react';
import type {StudioSnapshot} from '../lib/studio-model';
import {StudioItemDialog} from './studio-item-dialog';
import {StudioAction} from './studio-actions';
import {StudioMediaPicker,StudioUpload,type PickerAsset} from './studio-media-picker';
export function StudioCoverEditor({snapshot,csrf,onChange,onImage,onBusy}:{snapshot:StudioSnapshot;csrf:string;onChange:(coverId:string,alt:string)=>void;onImage:(asset:PickerAsset)=>void;onBusy:(busy:boolean)=>void}){
 const [open,setOpen]=useState(false);
 return <section className="public-card studio-cover-summary"><h2>Cover image <small>(optional)</small></h2>{snapshot.coverId?<img className="upload-local-preview" src={`/control/media/${snapshot.coverId}/preview`} alt={snapshot.coverAlt||snapshot.title}/>:<p>No cover selected.</p>}<StudioAction icon="images" label={snapshot.coverId?'Edit cover':'Add cover'} onClick={()=>setOpen(true)}/>{open&&<CoverDialog snapshot={snapshot} csrf={csrf} onCancel={()=>setOpen(false)} onBusy={onBusy} onSave={(id,alt,asset)=>{if(asset)onImage(asset);onChange(id,alt);setOpen(false);}}/>}</section>;
}
function CoverDialog({snapshot,csrf,onSave,onCancel,onBusy}:{snapshot:StudioSnapshot;csrf:string;onSave:(id:string,alt:string,asset?:PickerAsset)=>void;onCancel:()=>void;onBusy:(busy:boolean)=>void}){
 const [id,setId]=useState(snapshot.coverId||''),[alt,setAlt]=useState(snapshot.coverAlt||''),[asset,setAsset]=useState<PickerAsset>(),[busy,setBusy]=useState(false);
 const pick=(a:PickerAsset)=>{setId(a.id);setAsset(a);};
 const dirty=id!==(snapshot.coverId||'')||alt!==(snapshot.coverAlt||'');
 return <StudioItemDialog title="Cover image" dirty={dirty} busy={busy} onDismiss={onCancel} actions={<><StudioAction icon="save" label="Save cover" disabled={busy} onClick={()=>onSave(id,alt,asset)}/>{id&&<StudioAction icon="remove" label="Remove cover" disabled={busy} onClick={()=>{if(window.confirm('Remove the cover from this working content? Its Media Library asset is retained.')){setId('');setAsset(undefined);}}}/>}</>}><div className="studio-item-fields">{id&&<figure className="studio-item-image"><img src={`/control/media/${id}/preview`} alt={alt||snapshot.title}/></figure>}<label>Image description<input value={alt} maxLength={1000} onChange={e=>setAlt(e.target.value)}/></label><StudioMediaPicker label="Choose from Media Library" csrf={csrf} onSelect={pick}/><StudioUpload label="Upload Image" csrf={csrf} onUploaded={pick} onBusy={value=>{setBusy(value);onBusy(value);}}/><p>Uploaded images stay private in Media Library, including when you cancel this item.</p></div></StudioItemDialog>;
}
