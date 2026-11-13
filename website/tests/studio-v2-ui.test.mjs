import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {ContentBody} from '../app/components/content-body.ts';
import * as eventTime from '../app/lib/event-time.ts';
import * as memories from '../app/lib/about-memories.ts';
import {normalizeSnapshot} from '../app/lib/studio.server.ts';

async function components(){
 const imports={'../lib/about-memories':memories,react:React,'react/jsx-runtime':jsx,'./content-body':{ContentBody,safeContentHref:(value)=>value.startsWith('/')||value.startsWith('https://')?value:null},'../lib/event-time':eventTime,'react-router':{Form:'form',Link:({to,...props})=>React.createElement('a',{...props,href:to}),useNavigation:()=>({state:'idle'})}};
 async function load(name){const module={exports:{}};const source=await readFile(`app/components/${name}.tsx`,'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,TextEncoder,URLSearchParams,require:key=>{assert.ok(key in imports,key);return imports[key];}});imports['./'+name]=module.exports;return module.exports;}
 await load('studio-actions');await load('studio-item-dialog');await load('studio-media-picker');await load('studio-collection-manager');await load('studio-cover-editor');await load('about-memories-editor');await load('publication-time');const rendering=await load('studio-render');return {...rendering,...await load('studio-editor')};
}
const assetId='11111111-1111-4111-8111-111111111111';
const image={assetId,src:'/safe/detail',cardSrc:'/safe/card',width:640,height:360,alt:'TEST screenshot',creator:'TEST Creator',requiredCredit:'',source:''};

test('V2 uses one compact toolbar, optional uploads and direct role-aware publishing',async()=>{
 const {StudioEditor}=await components();const props={document:null,snapshot:{title:'TEST Post',body_text:'TEST body'},kind:'announcement',csrf:'test-only',role:'Moderator',images:{},history:[]};
 const html=render(React.createElement(StudioEditor,props));assert.match(html,/Save Draft/);assert.match(html,/Preview<\/button>/);assert.match(html,/Publish<\/button>/);assert.match(html,/Add cover/);assert.match(html,/Insert Image/);assert.doesNotMatch(html,/Approve|Review|rights holder|permission evidence|name="creator"/);assert.equal((html.match(/class="editor-toolbar"/g)||[]).length,1);
 const live=render(React.createElement(StudioEditor,{...props,publication:{liveRevision:1,pendingRevision:null,pendingDueAt:null},document:{id:assetId,status:'published',revision:2,version:4,live_release_id:assetId,pending_release_id:null}}));assert.match(live,/Live revision 1 remains public/);assert.match(live,/Update<\/button>/);assert.match(live,/Schedule Update/);assert.match(live,/Save Draft/);assert.match(live,/Unpublish/);assert.doesNotMatch(live,/>Delete</);
});

test('V2 previews remove covers, render inline media safely and credit only gallery or required licences',async()=>{
 const {StudioFigure,StudioPreview}=await components();assert.doesNotMatch(render(React.createElement(StudioFigure,{image})),/TEST Creator|figcaption/);assert.match(render(React.createElement(StudioFigure,{image,gallery:true})),/TEST Creator/);assert.match(render(React.createElement(StudioFigure,{image:{...image,requiredCredit:'Required licence credit'}})),/Required licence credit/);
 const html=render(React.createElement(StudioPreview,{snapshot:{title:'TEST',body_text:`**Bold**\n\n![TEST inline](media:${assetId})\n\n<script>unsafe</script>`},images:{cover:image},kind:'announcement'}));assert.equal((html.match(/<img /g)||[]).length,1,'Removed cover is absent, inline image remains');assert.match(html,/<strong>Bold<\/strong>/);assert.doesNotMatch(html,/<script>/);
});

test('V2 collection links cannot escape this website through slash or backslash tricks',()=>{
 const item={id:assetId,assetId,title:'TEST',description:'',alt:'',enabled:true,featured:false,linkText:'Open'};
 for(const link of ['//evil.example','/\\evil.example','https://evil.example','/bad\npath'])assert.throws(()=>normalizeSnapshot({title:'TEST',body_text:'',items:[{...item,link}]},'homepage'),/this website/);
 assert.equal(normalizeSnapshot({title:'TEST',body_text:'',items:[{...item,link:'/community'}]},'homepage').media.length,1);
});

test('V2 rejects malformed image-entry payloads as validation errors',()=>{
 for(const items of [{},[null],[{id:assetId,assetId,title:5}]] )assert.throws(()=>normalizeSnapshot({title:'TEST',body_text:'',items},'gallery'),error=>error.status===400);
 assert.throws(()=>normalizeSnapshot({title:'TEST',body_text:'TEST',location:'x'.repeat(301)},'event'),error=>error.status===400);
});

test('About Memories starts with a visual empty collection and a single publication toolbar',async()=>{
 const {StudioEditor}=await components();const html=render(React.createElement(StudioEditor,{document:null,snapshot:{title:'About memories',body_text:'',memories:{}},kind:'about-memories',csrf:'test-only',role:'Moderator',images:{},history:[]}));
 assert.equal((html.match(/class="editor-toolbar"/g)||[]).length,1);assert.match(html,/Add Photos/);assert.match(html,/0 \/ 100 photos/);assert.match(html,/Your next memory starts here/);assert.doesNotMatch(html,/Opening scrapbook|History scrapbook|Community memory [2-5]/);assert.doesNotMatch(html,/Add Slide|studio-body|Insert Image/);assert.match(html,/Save Draft/);assert.match(html,/Publish<\/button>/);
});


test('Visual collection overview preserves legacy photo references and keeps editing fields inside dialogs',async()=>{
 const {StudioEditor}=await components();
 const snapshot={title:'About memories',body_text:'',memories:{opening:{assetId,alt:'Historical friends in a hall'},history:{assetId,alt:'Historical trees over a lake'}}};
 const html=render(React.createElement(StudioEditor,{document:null,snapshot,kind:'about-memories',csrf:'test-only',role:'Moderator',images:{'memory:opening':image,'memory:history':image},history:[]}));
 assert.equal((html.match(/class="studio-photo-card"/g)||[]).length,2);
 assert.match(html,/Featured collage image/);assert.match(html,/Story image/);
 assert.match(html,/aria-label="Edit photo 1"/);assert.match(html,/title="Remove photo 2"/);
 assert.doesNotMatch(html,/<textarea|Unused position|Opening scrapbook/);
});


test('Shared collection cards identify slide positions and gallery creator/required attribution',async()=>{
 const {StudioEditor}=await components(),item={id:assetId,assetId,title:'TEST shared image',description:'',alt:'TEST shared landscape',link:'',linkText:'',enabled:true,featured:false};
 const props={document:null,snapshot:{title:'TEST',body_text:'',items:[item]},csrf:'test-only',role:'Moderator',images:{[assetId]:{...image,requiredCredit:'TEST required credit'}},history:[]};
 assert.match(render(React.createElement(StudioEditor,{...props,kind:'homepage'})),/Slide 1/);
 const gallery=render(React.createElement(StudioEditor,{...props,kind:'gallery'}));assert.match(gallery,/TEST Creator \/ TEST required credit/);assert.match(gallery,/Visible when published/);
});
