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
import {normalizeSnapshot} from '../app/lib/studio.server.ts';

async function components(){
 const imports={react:React,'react/jsx-runtime':jsx,'./content-body':{ContentBody},'../lib/event-time':eventTime,'react-router':{Form:'form',Link:({to,...props})=>React.createElement('a',{...props,href:to}),useNavigation:()=>({state:'idle'})}};
 async function load(name){const module={exports:{}};const source=await readFile(`app/components/${name}.tsx`,'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:key=>{assert.ok(key in imports,key);return imports[key];}});imports['./'+name]=module.exports;return module.exports;}
 await load('studio-media-picker');await load('publication-time');const rendering=await load('studio-render');return {...rendering,...await load('studio-editor')};
}
const assetId='11111111-1111-4111-8111-111111111111';
const image={assetId,src:'/safe/detail',cardSrc:'/safe/card',width:640,height:360,alt:'TEST screenshot',creator:'TEST Creator',requiredCredit:'',source:''};

test('V2 uses one compact toolbar, optional uploads and direct role-aware publishing',async()=>{
 const {StudioEditor}=await components();const props={document:null,snapshot:{title:'TEST Post',body_text:'TEST body'},kind:'announcement',csrf:'test-only',role:'Moderator',images:{},history:[]};
 const html=render(React.createElement(StudioEditor,props));assert.match(html,/Save Draft/);assert.match(html,/>Preview</);assert.match(html,/>Publish</);assert.match(html,/Upload Image/);assert.match(html,/Choose from Media Library/);assert.match(html,/Insert Image/);assert.doesNotMatch(html,/Approve|Review|rights holder|permission evidence|name="creator"/);assert.equal((html.match(/class="editor-toolbar"/g)||[]).length,1);
 const live=render(React.createElement(StudioEditor,{...props,document:{id:assetId,status:'published',revision:2,version:4,live_release_id:assetId,pending_release_id:null}}));assert.match(live,/Save Changes/);assert.match(live,/Unpublish/);assert.doesNotMatch(live,/>Delete</);
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
