import { toolbarComponents } from './fixtures/toolbar-components.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup as render } from 'react-dom/server';
import * as eventTime from '../app/lib/event-time.ts';
async function load(file,imports){const module={exports:{}};const code=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:key=>{assert.ok(key in imports,key);return imports[key];}});return module.exports;}
const w={content_id:'test-only',editorial_revision:4,version:7,status:'draft',live_release_id:null};
test('shared toolbar shows only role/state-appropriate actions and blocks unsaved publishing',async()=>{
 const {EditorToolbar}=await toolbarComponents();
 const html=(status,role='Owner',dirty=false)=>render(React.createElement(EditorToolbar,{workflow:{...w,status},kind:'announcement',title:'TEST ONLY title',role,csrf:'test',formId:'test-form',dirty,history:React.createElement('p',null,'TEST ONLY history')}));
 const moderator=html('draft','Moderator');assert.match(moderator,/Submit for Review/);assert.doesNotMatch(moderator,/Approve &amp; Publish|Schedule Publish|Approve Only|Reject|Archive/);
 for(const role of ['Owner','Administrator'])for(const status of ['draft','review','approved']){const content=html(status,role);assert.match(content,/Approve &amp; Publish/);assert.match(content,/Schedule Publish/);assert.doesNotMatch(content,/<dialog[^>]*open|type="date"|<select/);assert.match(content,/<details/);assert.equal((content.match(/>Save</g)||[]).length,1);}
 assert.match(html('review'),/Approve Only/);assert.match(html('review'),/Reject/);assert.match(html('scheduled'),/Cancel schedule/);assert.doesNotMatch(html('scheduled'),/Approve &amp; Publish|Schedule Publish/);
 assert.doesNotMatch(html('archived'),/Approve &amp; Publish|Schedule Publish|>Archive</);assert.match(html('draft','Owner',true),/Unsaved changes/);assert.match(html('draft','Owner',true),/disabled="" aria-haspopup="dialog"/);
 const event=render(React.createElement(EditorToolbar,{workflow:w,kind:'event',title:'TEST ONLY event',role:'Owner',csrf:'test',formId:'event-form'}));assert.match(event,/Event editor actions/);assert.match(event,/form="event-form"/);assert.match(event,/More/);
});
test('publication picker shows quarter-hour AM/PM Toronto controls and friendly DST clarification',async()=>{
 const values=['2026-11-01','01:30',''];const fakeReact={useState:()=>{const i=cursor++;return [values[i],next=>values[i]=next];}};let cursor=0;
 const {PublicationTime}=await load('app/components/publication-time.tsx',{react:fakeReact,'react/jsx-runtime':jsx,'../lib/event-time':eventTime});
 const html=()=>{cursor=0;return render(PublicationTime());};let result=html();assert.match(result,/First 1:30 AM/);assert.match(result,/Second 1:30 AM/);assert.match(result,/type="radio"/);assert.doesNotMatch(result,/UTC|GMT|timezone|datetime-local/);assert.equal((result.match(/<option/g)||[]).length,97);
 values[2]='later';result=html();assert.match(result,/second/);assert.match(result,/November 1, 2026/);
 values[0]='2026-03-08';values[1]='02:30';values[2]='';result=html();assert.match(result,/clocks jump forward/);assert.doesNotMatch(result,/type="radio"/);
});
