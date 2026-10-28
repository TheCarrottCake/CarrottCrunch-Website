import type {StudioSnapshot, StudioImage} from '../lib/studio-model';
import {memorySlots, memoryLabels, type MemorySlot} from '../lib/about-memories';
import {StudioUpload, StudioMediaPicker, type PickerAsset} from './studio-media-picker';
import {safeContentHref} from './content-body';

type Props = {snapshot: StudioSnapshot; images: Record<string,StudioImage>};
function MemoryPreview({slot,snapshot,images}: Props & {slot:MemorySlot}) {
  const entry=snapshot.memories?.[slot], image=images[`memory:${slot}`];
  const source=image?.source ? safeContentHref(image.source) : null;
  return <figure className={`studio-memory-preview studio-memory-preview--${slot}`}>
    <div className="studio-memory-frame">{entry && image?.assetId === entry.assetId ? <img src={image.src} alt={entry.alt} width={image.width} height={image.height}/> : <p>No image selected. The About page will show its existing placeholder.</p>}</div>
    {image?.assetId === entry?.assetId && image?.requiredCredit && <figcaption>{image.requiredCredit}{source && <> · <a href={source} rel="noreferrer">Source</a></>}</figcaption>}
  </figure>;
}
export function AboutMemoriesPreview(props:Props) {
  return <section aria-label="About Memories preview" className="studio-about-memories"><p>Preview of this working revision. Both slots publish together.</p>{memorySlots.map(slot=><section key={slot}><h2>{memoryLabels[slot]}</h2><MemoryPreview {...props} slot={slot}/></section>)}</section>;
}
export function AboutMemoriesFields({snapshot,images,csrf,onChange,onImage,onBusy}:Props & {
  csrf:string; onChange:(memories:NonNullable<StudioSnapshot['memories']>)=>void;
  onImage:(asset:PickerAsset,placement:string)=>void; onBusy:(busy:boolean)=>void;
}) {
  const select=(slot:MemorySlot,asset:PickerAsset)=>{
    onImage(asset,`memory:${slot}`);
    onChange({...snapshot.memories,[slot]:{assetId:asset.id,alt:asset.alt_text || ''}});
  };
  return <section className="studio-about-memories" aria-label="About page scrapbook images">
    <p>Choose genuine community memories. Originals stay in the shared Media Library. Removing a slot does not delete its image.</p>
    {memorySlots.map(slot=>{const entry=snapshot.memories?.[slot];return <section key={slot} className="public-card" aria-labelledby={`memory-${slot}-heading`}>
      <h2 id={`memory-${slot}-heading`}>{memoryLabels[slot]}</h2>
      <p>{slot==='opening'?'Opening scrapbook':'History scrapbook'} · Optional</p>
      <MemoryPreview snapshot={snapshot} images={images} slot={slot}/>
      {entry && <label>Image description for {memoryLabels[slot]}<textarea maxLength={1000} value={entry.alt} rows={2} onChange={e=>onChange({...snapshot.memories,[slot]:{...entry,alt:e.target.value}})}/><small>Describe the real image. Required before publishing.</small></label>}
      <StudioUpload csrf={csrf} label={entry?'Upload replacement':'Upload image'} onUploaded={asset=>select(slot,asset)} onBusy={onBusy}/>
      <div className="studio-actions"><StudioMediaPicker csrf={csrf} label={entry?'Replace from Library':'Choose from Library'} onSelect={asset=>select(slot,asset)}/>
        {entry && <button type="button" className="button secondary" onClick={event=>{
          const section=event.currentTarget.closest('section');
          const memories={...snapshot.memories};delete memories[slot];onChange(memories);
          requestAnimationFrame(()=>section?.querySelector<HTMLButtonElement>('.studio-actions button')?.focus());
        }}>Remove image<span className="sr-only">: {memoryLabels[slot]}</span></button>}
      </div>
    </section>;})}
  </section>;
}
