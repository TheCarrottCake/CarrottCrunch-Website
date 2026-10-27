import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const asset={id:'11111111-1111-4111-8111-111111111111',title:'TEST image',description:'',tags:'',internal_notes:'',alt_text:'TEST screenshot',creator_name:'TEST creator',source_url:'',required_credit:'',publication_blocked:0,rights_expires_at:null,version:1,width:640,height:360,usage_count:0,deleted_at:null};
async function harness(fetch){
 const slots=[];let cursor=0;
 const useState=initial=>{const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],next=>{slots[index]=typeof next==='function'?next(slots[index]):next;}];};
 const imports={react:{useState,useRef:initial=>useState(()=>({current:initial}))[0],useEffect(){}},'react/jsx-runtime':jsx,'react-router':{data:value=>value},'../lib/cloudflare-context.server':{},'../lib/content-studio.server':{},'../components/control-dashboard':{ControlDashboard:'dashboard'},'../components/studio-media-picker':{StudioUpload:'upload'}};
 const module={exports:{}};const source=(await readFile('app/routes/studio-library.tsx','utf8')).replaceAll('import.meta.env.DEV','false');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>{assert.ok(name in imports,name);return imports[name];},fetch,URLSearchParams,FormData:class{constructor(form){this.entries=form.entries;}[Symbol.iterator](){return this.entries[Symbol.iterator]();}},requestAnimationFrame:callback=>callback(),window:{confirm:()=>true}});
 return ()=>{cursor=0;return module.exports.default({loaderData:{csrf:'TEST csrf',role:'Moderator',identity:{username:'TEST'}}});};
}
function nodes(value,predicate){if(!value||typeof value!=='object')return [];if(Array.isArray(value))return value.flatMap(child=>nodes(child,predicate));return [...(predicate(value)?[value]:[]),...nodes(value.props?.children,predicate)];}
const one=(tree,predicate)=>{const result=nodes(tree,predicate);assert.equal(result.length,1);return result[0];};
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=value=>({ok:true,json:async()=>value});

test('Media Library shows loading and ignores older search responses',async()=>{
 const requests=[];const render=await harness(()=>new Promise(resolve=>requests.push(resolve)));let tree=render();
 assert.match(text(one(tree,node=>node.props?.role==='status')),/Loading images/);assert.doesNotMatch(text(tree),/No images found/);
 const refresh=()=>one(tree,node=>node.type==='upload').props.onUploaded();const first=refresh(),second=refresh();requests[1](response({items:[asset]}));await second;requests[0](response({items:[{...asset,title:'TEST stale result'}]}));await first;tree=render();
 assert.match(text(tree),/TEST image/);assert.doesNotMatch(text(tree),/TEST stale result/);
});

test('Media Library preserves its dialog and metadata after usage, save and trash failures',async()=>{
 let mode='list',submitted,closed=0,opened=0,focused=0;
 const render=await harness(async(_url,options)=>{if(mode==='list')return response({items:[asset]});if(mode==='save'){submitted=options.body;return {ok:false,json:async()=>({message:'TEST revision conflict; input preserved'})};}throw new Error('TEST network failure');});
 let tree=render();await one(tree,node=>node.type==='upload').props.onUploaded();tree=render();const modal=one(tree,node=>node.type==='dialog');modal.props.ref.current={showModal(){opened++;},close(){closed++;}};
 mode='usage-failure';one(tree,node=>node.type==='button'&&text(node)==='Details & metadata').props.onClick({currentTarget:{isConnected:true,focus(){focused++;}}});await tick();tree=render();assert.equal(opened,1);assert.match(text(tree),/Unable to load image usage/);assert.equal(closed,0);
 mode='save';await one(tree,node=>node.type==='form').props.onSubmit({preventDefault(){},currentTarget:{entries:[['creator','TEST edited creator'],['id',asset.id],['version','1'],['intent','metadata']]}});tree=render();assert.equal(submitted.get('creator'),'TEST edited creator');assert.match(text(tree),/TEST revision conflict/);assert.equal(closed,0);
 mode='trash-failure';one(tree,node=>node.type==='button'&&text(node)==='Delete unused image').props.onClick();await tick();tree=render();assert.match(text(tree),/Unable to update the image/);assert.equal(closed,0);assert.equal(one(tree,node=>node.props?.name==='creator').props.defaultValue,'TEST creator');
 one(tree,node=>node.type==='dialog').props.onClose();assert.equal(focused,1);
});
