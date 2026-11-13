import {useEffect,useId,useRef,type ReactNode} from 'react';
/** Item changes remain local until explicit Save; publication belongs to the parent toolbar. */
export function StudioItemDialog({title,dirty,busy=false,onDismiss,children,actions,contextLabel='Collection item',note='Save adds these edits to your working collection. Use the collection toolbar to save a private revision or publish.'}:{title:string;dirty:boolean;busy?:boolean;onDismiss:()=>void;children:ReactNode;actions:ReactNode;contextLabel?:string;note?:string}){
 const ref=useRef<HTMLDialogElement>(null),origin=useRef<HTMLElement|null>(null),id=useId();
 const dismiss=()=>{if(busy)return;if(!dirty||window.confirm('Discard unsaved item changes? Saved information is unchanged.'))onDismiss();};
 useEffect(()=>{const d=ref.current!,root=document.documentElement,overflow=root.style.overflow;origin.current=document.activeElement as HTMLElement;d.showModal();root.style.overflow='hidden';d.querySelector<HTMLElement>('input,textarea,select,button')?.focus();return()=>{d.close();root.style.overflow=overflow;if(origin.current?.isConnected)origin.current.focus({preventScroll:true});else document.getElementById('studio-collection-heading')?.focus({preventScroll:true});};},[]);
 useEffect(()=>{const d=ref.current!,viewport=window.visualViewport;
 const resize=()=>{d.style.setProperty('--studio-viewport-height',`${viewport?.height??window.innerHeight}px`);d.style.setProperty('--studio-viewport-top',`${viewport?.offsetTop??0}px`);};
 resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);
 return()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize);};},[]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty||busy){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,busy]);
 return <dialog ref={ref} className="studio-item-dialog" aria-labelledby={id} onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();dismiss();}} onKeyDown={e=>{
 if(e.target instanceof Element&&e.target.closest('dialog')!==e.currentTarget)return;
 if(e.key==='Enter'&&e.target instanceof HTMLInputElement)e.preventDefault();
 if(e.key!=='Tab')return;
 const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled):not([hidden]),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }}><header><div><p className="eyebrow">{contextLabel}</p><h2 id={id}>{title}</h2></div><button type="button" className="button secondary studio-dialog-close" aria-label="Close editor" disabled={busy} onClick={dismiss}><span aria-hidden="true">&times;</span></button></header><div className="studio-item-content"><p className="studio-item-note">{note}</p>{children}</div><footer className="studio-item-footer"><button type="button" className="button secondary" disabled={busy} onClick={dismiss}>Cancel</button>{actions}</footer></dialog>;
}
