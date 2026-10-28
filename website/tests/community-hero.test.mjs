import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {safeContentHref} from '../app/components/content-body.ts';
import * as model from '../app/lib/community-hero.ts';

const slides=[1,2,3].map(n=>({id:'TEST '+n,image:`/media/studio/${String(n).repeat(8)}-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/detail`,width:1280,height:720,title:'TEST image '+n,text:'TEST description',alt:'TEST screenshot '+n,link:'/gallery',linkText:'Gallery',credit:n===1?'TEST required credit':'',creditSource:''}));
const nodes=(value,predicate)=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(child=>nodes(child,predicate)):[...(predicate(value)?[value]:[]),...nodes(value.props?.children,predicate)];
const one=(tree,predicate)=>{const found=nodes(tree,predicate);assert.equal(found.length,1);return found[0];};
const button=(tree,label)=>one(tree,node=>node.type==='button'&&node.props?.['aria-label']===label);
const imageNodes=tree=>nodes(tree,node=>node.props?.className==='v3-hero-image');

async function components(react=React,environment={}){
 const imports={react,'react/jsx-runtime':jsx,'react-router':{Link:({to,...props})=>React.createElement('a',{href:to,...props})},'./community':{CrunchMark:props=>React.createElement('img',{...props,src:'/branding/carrottcrunch-icon.svg',alt:''})},'./content-body':{safeContentHref},'../lib/community-hero':model};
 async function load(name){const module={exports:{}};vm.runInNewContext(ts.transpileModule(await readFile(`app/components/${name}.tsx`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>{assert.ok(name in imports,name);return imports[name];},...environment});imports['./'+name]=module.exports;return module.exports;}
 const viewer=await load('full-image-dialog');return {...viewer,...await load('community-hero')};
}

async function harness(name,props,{reduced=false}={}){
 const slots=[],timers=new Map(),preloads=[],listeners=new Map(),mediaListeners=new Set();let cursor=0,pending=[],dirty=false,tree,timerId=0,modalOpen=false;
 const doc={visibilityState:'visible',activeElement:null,documentElement:{style:{overflow:'auto',scrollbarGutter:''}},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const media={matches:reduced,addEventListener:(_name,fn)=>mediaListeners.add(fn),removeEventListener:(_name,fn)=>mediaListeners.delete(fn)};
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(initial){const i=cursor++;slots[i]??={kind:'state',value:typeof initial==='function'?initial():initial};return [slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
  useRef(initial){const i=cursor++;slots[i]??={kind:'ref',value:{current:initial}};return slots[i].value;},
  useId(){const i=cursor++;slots[i]??={kind:'id',value:'TEST-id-'+i};return slots[i].value;},
  useMemo(fn,deps){const i=cursor++;if(!equal(slots[i]?.deps,deps))slots[i]={kind:'memo',deps,value:fn()};return slots[i].value;},
  useCallback(fn,deps){return this.useMemo(()=>fn,deps);},
  useEffect(fn,deps){const i=cursor++;if(!equal(slots[i]?.deps,deps)){pending.push({i,fn,cleanup:slots[i]?.cleanup});slots[i]={kind:'effect',deps};}}
 };
 // Named imports invoke callbacks without a receiver.
 react.useCallback=(fn,deps)=>react.useMemo(()=>fn,deps);
 class FakeImage{constructor(){preloads.push(this);}}
 const win={matchMedia:()=>media,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id)};
 const loaded=await components(react,{window:win,document:doc,Image:FakeImage});
 const focusable=()=>nodes(tree,node=>node.type==='button'||node.type==='a').filter(node=>node.props.ref?.current).map(node=>node.props.ref.current);
 const settle=()=>{
  let attempts=0;do{assert.ok(++attempts<30,'Hook render loop');dirty=false;cursor=0;pending=[];tree=loaded[name](props);
   for(const node of nodes(tree,node=>!!node.props?.ref)){
    const ref=node.props.ref;if(typeof ref!=='object')continue;
    if(!ref.current)ref.current={complete:false,naturalWidth:0,focus(){doc.activeElement=this;},showModal(){modalOpen=true;},close(){modalOpen=false;node.props.onClose?.();},querySelectorAll:()=>nodes(one(tree,n=>n.type==='dialog'),n=>n.type==='button'||n.type==='a').filter(n=>n.props.ref?.current).map(n=>n.props.ref.current)};
   }
   for(const effect of pending){effect.cleanup?.();slots[effect.i].cleanup=effect.fn();}
  }while(dirty);return tree;
 };
 return {settle,get tree(){return tree;},timers,preloads,doc,media,mediaListeners,listeners,get modalOpen(){return modalOpen;},fire(delay){for(const [id,timer] of timers)if(timer.delay===delay){timers.delete(id);timer.fn();break;}return settle();},unmount(){for(const slot of slots)slot.cleanup?.();}};
}

test('Hero SSR preserves copy, CTA destinations and a complete image-free fallback',async()=>{
 const {CommunityHero}=await components();const html=renderToStaticMarkup(React.createElement(CommunityHero,{slides:[]}));
 for(const copy of ['A little crunch. A lot of community.','Find your people.','Build your','world.','Good games bring us together.','Great people make us stay.','Welcome to CarrottCrunch.'])assert.ok(html.includes(copy),copy);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(html,/id="home"/);assert.match(html,/href="\/join"/);assert.match(html,/href="#server"/);assert.match(html,/class="v3-world"/);assert.doesNotMatch(html,/ILLUSTRATED PLACEHOLDER|overworld\.svg|data-has-image="true"/);
 const published=renderToStaticMarkup(React.createElement(CommunityHero,{slides}));assert.equal((published.match(/class="v3-hero-image"/g)||[]).length,1,'SSR requests only the first image');
});

test('Hero accepts only guarded public derivatives and removes unavailable sources',()=>{
 for(const src of ['/control/media/a/preview','https://example.test/private.png','/media/studio/a/b/original','data:image/png;base64,AAAA',slides[0].image+'?key=original'])assert.equal(model.isPublicHeroImage(src),false);
 assert.equal(model.isPublicHeroImage(slides[0].image),true);assert.equal(model.usableHeroSlides([...slides,slides[0]],new Set([slides[1].image])).length,2);assert.equal(model.adjacentHeroSlide(slides,slides[0].id,-1).id,slides[2].id);
});

test('Hero waits for loaded images, crossfades two layers, preloads one next image and rejects stale loads',async()=>{
 const h=await harness('CommunityHero',{slides});let tree=h.settle();assert.equal(tree.props['data-has-image'],false);assert.equal(h.preloads.length,0);assert.equal(h.timers.size,0);
 imageNodes(tree)[0].props.onLoad();tree=h.settle();assert.equal(tree.props['data-has-image'],true);assert.equal(tree.props['data-transitioning'],false,'The first decoded image must appear without a crossfade delay');assert.deepEqual(h.preloads.map(image=>image.src),[slides[1].image]);assert.ok([...h.timers.values()].some(timer=>timer.delay===7000));
 button(tree,'Next slide').props.onClick();tree=h.settle();assert.equal(imageNodes(tree).length,2);const second=imageNodes(tree).find(image=>image.props.src===slides[1].image);button(tree,'Next slide').props.onClick();tree=h.settle();second.props.onLoad();tree=h.settle();assert.ok(imageNodes(tree).some(image=>image.props.src===slides[0].image),'Slow stale image did not replace the current slide');
 imageNodes(tree).find(image=>image.props.src===slides[2].image).props.onLoad();tree=h.settle();assert.equal(imageNodes(tree).length,2);assert.equal(tree.props['data-transitioning'],true);assert.equal(one(tree,node=>node.props?.className==='v3-hero-layer'&&node.props['data-active']===true).props.children.props.src,slides[2].image);tree=h.fire(1200);assert.equal(imageNodes(tree).length,1);h.unmount();assert.equal(h.timers.size,0);assert.equal(h.mediaListeners.size,0);assert.equal(h.listeners.size,0);
});

test('Hero pauses timers/zoom for hover, focus, explicit pause and viewer; reduced motion prevents autoplay',async()=>{
 const h=await harness('CommunityHero',{slides});let tree=h.settle();imageNodes(tree)[0].props.onLoad();tree=h.settle();
 tree.props.onMouseEnter();tree=h.settle();assert.equal(tree.props['data-moving'],false);assert.equal(h.timers.size,0);tree.props.onMouseLeave();tree=h.settle();assert.equal(tree.props['data-moving'],true);
 tree.props.onFocusCapture();tree=h.settle();assert.equal(h.timers.size,0);tree.props.onBlurCapture({currentTarget:{contains:()=>false},relatedTarget:null});tree=h.settle();button(tree,'Pause slideshow').props.onClick();tree=h.settle();assert.equal(tree.props['data-moving'],false);button(tree,'Resume slideshow').props.onClick();tree=h.settle();
 one(tree,node=>typeof node.type==='function'&&node.props?.onOpenChange).props.onOpenChange(true);tree=h.settle();assert.equal(h.timers.size,0);
 h.media.matches=true;for(const listener of h.mediaListeners)listener();tree=h.settle();assert.equal(tree.props['data-reduced'],true);assert.equal(h.timers.size,0);assert.equal(button(tree,'Automatic slideshow disabled for reduced motion').props.disabled,true);h.unmount();
});

test('One-image and broken-image heroes stay usable without invented photography',async()=>{
 const h=await harness('CommunityHero',{slides:[slides[0]]});let tree=h.settle();imageNodes(tree)[0].props.onLoad();tree=h.settle();assert.equal(h.timers.size,0);assert.equal(h.preloads.length,0);assert.equal(nodes(tree,node=>node.props?.['aria-label']==='Next slide').length,0);
 assert.equal(tree.props['data-moving'],false,'A single image must not zoom without a pause control');
 imageNodes(tree)[0].props.onError();tree=h.settle();assert.equal(tree.props['data-has-image'],false);assert.equal(imageNodes(tree).length,0);h.unmount();
});

test('Full-image viewer snapshots the authorized image, contains focus and restores it after close',async()=>{
 const changes=[];const h=await harness('FullImageDialog',{image:slides[0],onOpenChange:value=>changes.push(value)});let tree=h.settle();const trigger=one(tree,node=>node.type==='button'&&node.props?.['aria-haspopup']==='dialog');trigger.props.onClick();tree=h.settle();assert.equal(h.modalOpen,true);assert.equal(h.doc.documentElement.style.overflow,'hidden');assert.equal(h.doc.documentElement.style.scrollbarGutter,'stable');assert.equal(one(tree,node=>node.type==='img').props.src,slides[0].image);assert.equal(changes[0],true);
 const dialog=one(tree,node=>node.type==='dialog');assert.ok(dialog.props['aria-labelledby']);assert.ok(dialog.props['aria-describedby']);let prevented=false;dialog.props.onKeyDown({key:'Tab',shiftKey:true,currentTarget:dialog.props.ref.current,preventDefault(){prevented=true;}});assert.equal(prevented,true);
 one(tree,node=>node.type==='img').props.onError();tree=h.settle();assert.equal(nodes(tree,node=>node.props?.role==='alert').length,1);one(tree,node=>node.type==='dialog').props.ref.current.close();tree=h.settle();assert.equal(h.doc.documentElement.style.overflow,'auto');assert.equal(h.doc.documentElement.style.scrollbarGutter,'');assert.equal(h.doc.activeElement,trigger.props.ref.current);assert.deepEqual(changes,[true,false]);h.unmount();
});

test('A revalidated empty collection clears viewer pause and a later release can rotate normally',async()=>{
 const props={slides};const h=await harness('CommunityHero',props);let tree=h.settle();imageNodes(tree)[0].props.onLoad();tree=h.settle();one(tree,node=>typeof node.type==='function'&&node.props?.onOpenChange).props.onOpenChange(true);tree=h.settle();assert.equal(h.timers.size,0);
 props.slides=[];tree=h.settle();assert.equal(tree.props['data-has-image'],false);props.slides=slides;tree=h.settle();imageNodes(tree)[0].props.onLoad();tree=h.settle();assert.ok([...h.timers.values()].some(timer=>timer.delay===7000));h.unmount();
});

test('Cinematic progress follows usable published slides without adding selector buttons',async()=>{
 const h=await harness('CommunityHero',{slides});let tree=h.settle();
 assert.equal(one(tree,node=>node.props?.className==='v3-hero-progress').props['aria-hidden'],true);
 imageNodes(tree)[0].props.onLoad();tree=h.settle();
 const progress=()=>one(tree,node=>node.props?.className==='v3-hero-progress');
 assert.equal(progress().props['aria-label'],'Slide 1 of 3');assert.equal(progress().props.children.length,3);
 assert.equal(progress().props['aria-hidden'],false);
 assert.equal(nodes(tree,node=>node.props?.className==='v3-hero-count').length,1);
 assert.equal(nodes(progress(),node=>node.type==='button').length,0);
 assert.equal(nodes(progress(),node=>node.props?.['data-active']===true).length,1);
 button(tree,'Next slide').props.onClick();tree=h.settle();imageNodes(tree).find(image=>image.props.src===slides[1].image).props.onLoad();tree=h.settle();
 assert.equal(progress().props['aria-label'],'Slide 2 of 3');imageNodes(tree).find(image=>image.props.src===slides[1].image).props.onError();tree=h.settle();
 imageNodes(tree).find(image=>image.props.src===slides[0].image).props.onLoad();tree=h.settle();assert.equal(progress().props.children.length,2);
 h.unmount();
});

test('Background tabs stop rotation and slideshow announcements distinguish manual navigation',async()=>{
 const h=await harness('CommunityHero',{slides});let tree=h.settle();
 assert.equal(one(tree,node=>node.props?.className==='v3-hero-count').props.children[0],'–');
 imageNodes(tree)[0].props.onLoad();tree=h.settle();
 h.doc.visibilityState='hidden';h.listeners.get('visibilitychange')();tree=h.settle();assert.equal(tree.props['data-moving'],false);assert.equal(h.timers.size,0);
 h.doc.visibilityState='visible';h.listeners.get('visibilitychange')();tree=h.settle();assert.equal(tree.props['data-moving'],true);
 button(tree,'Next slide').props.onClick();tree=h.settle();imageNodes(tree).find(image=>image.props.src===slides[1].image).props.onLoad();tree=h.settle();
 assert.equal(one(tree,node=>node.props?.role==='status').props['aria-live'],'polite');
 tree=h.fire(7000);assert.equal(one(tree,node=>node.props?.role==='status').props['aria-live'],'off');h.unmount();
});
