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
import { ContentBody } from '../app/components/content-body.ts';
async function load(file,imports){const module={exports:{}};const code=ts.transpileModule((await readFile(file,'utf8')).replaceAll('import.meta.env.DEV','false'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{URLSearchParams,module,exports:module.exports,require:key=>{assert.ok(key in imports,key);return imports[key];}});return module.exports;}
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

test('toolbar identifies live and private revisions, approval, schedule and review decisions',async()=>{
 const {EditorToolbar}=await toolbarComponents();
 const html=extra=>render(React.createElement(EditorToolbar,{workflow:w,kind:'announcement',title:'TEST ONLY',role:'Owner',csrf:'test',...extra}));
 assert.match(html({}),/Not publicly visible/);
 const publication={liveRevision:2,scheduledAt:null,approvedBy:'TEST Reviewer',approvedAt:Date.UTC(2026,9,27,16)};
 const replacement=html({workflow:{...w,live_release_id:'test-live'},publication});
 assert.match(replacement,/Working revision 4/);assert.match(replacement,/Live revision 2/);assert.match(replacement,/Private unpublished edits/);
 assert.match(replacement,/Revision 4 approved by TEST Reviewer/);assert.doesNotMatch(replacement,/2026-10-27T|UTC|GMT/);
 const same=html({workflow:{...w,status:'published',live_release_id:'test-live'},publication:{...publication,liveRevision:4}});
 assert.doesNotMatch(same,/Private unpublished edits/);
 assert.match(html({workflow:{...w,status:'published',live_release_id:'test-live'},publication:{...publication,liveRevision:4},dirty:true}),/Private unpublished edits/);
 const scheduled=html({workflow:{...w,status:'scheduled'},publication:{...publication,liveRevision:null,scheduledAt:Date.UTC(2026,10,1,18)}});
 assert.match(scheduled,/Scheduled:/);assert.match(scheduled,/Toronto time/);assert.match(scheduled,/Not public until released/);
 assert.doesNotMatch(scheduled,/Approve &amp; Publish|Schedule Publish/);
 const review=html({workflow:{...w,status:'review'},returnToEditor:false});
 assert.equal((review.match(/>Reject</g)||[]).length,1);
 assert.ok(review.indexOf('>Reject<')<review.indexOf('<details'),'Review rejection is visible outside More');
 assert.doesNotMatch(html({workflow:{...w,status:'review'},role:'Moderator',returnToEditor:false}),/>Reject<|Approve/);
 const archived=html({workflow:{...w,status:'archived'}});assert.match(archived,/Read only/);assert.doesNotMatch(archived,/Approve &amp; Publish|Schedule Publish/);
});

test('review queue previews are labelled, escaped, role-aware and have useful empty states',async()=>{
 const {default:ReviewQueue}=await load('app/routes/control-review.tsx',{
  'react/jsx-runtime':jsx,
  'react-router':{data:()=>{},Form:'form',Link:({to,...props})=>React.createElement('a',{...props,href:to})},
  '../lib/cloudflare-context.server':{},'../lib/content-studio.server':{},
  '../components/studio-error':{},'../lib/event-time':eventTime,'../components/content-body':{ContentBody},
  '../components/control-dashboard':{ControlDashboard:({children})=>children},
 });
 const d={role:'Owner',items:[{id:'test-id',kind:'event',title:'TEST <script>',editorial_revision:7,actor_name:'TEST submitter',created_at:Date.UTC(2026,9,27,16),preview:'<script>alert(1)</script>',truncated:true}],offset:0,search:'',more:false};
 const html=extra=>render(React.createElement(ReviewQueue,{loaderData:{...d,...extra}}));
 const populated=html({});assert.match(populated,/Event.*Revision 7/);assert.match(populated,/Pending review/);assert.match(populated,/Submitted by TEST submitter/);assert.match(populated,/Preview event excerpt/);assert.match(populated,/Excerpt only/);assert.match(populated,/Review &amp; decide/);assert.doesNotMatch(populated,/<script>|2026-10-27T12/);
 assert.match(populated,/sr-only">: TEST &lt;script&gt;, revision 7/);
 assert.match(html({role:'Moderator'}),/View saved revision/);assert.doesNotMatch(html({role:'Moderator'}),/Review &amp; decide/);
 assert.match(html({items:[]}),/All caught up/);assert.match(html({items:[],search:'missing'}),/No matching submissions/);assert.match(html({items:[],offset:24}),/No more submissions/);
});
