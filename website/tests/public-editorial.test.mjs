import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {build} from 'esbuild';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';

async function component(path) {
  const result=await build({entryPoints:[path],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',plugins:[{
    name:'no-server-in-presentation-tests',setup(b){
      b.onResolve({filter:/\.server$/},args=>({path:args.path,namespace:'server-stub'}));
      b.onLoad({filter:/.*/,namespace:'server-stub'},()=>({contents:'export const contentEnvironmentContext={},studioPublic=()=>{},studioImages=()=>{},loadPublicContent=()=>{},publicContentSource=()=>{},getPublishedAnnouncement=()=>{};'}));
    }
  }]});
  const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),console,Date,Intl,Response});return module.exports;
}
const render=(Component,props)=>renderToStaticMarkup(h(MemoryRouter,null,h(Component,props)));

test('Editorial headers support optional context without images or unsafe title HTML',async()=>{
  const {EditorialHeader}=await component('app/components/public-page.tsx');
  const html=render(EditorialHeader,{title:'<script>Title</script>',accent:'.',eyebrow:'SECTION',description:'Introduction',children:h('a',{href:'/updates'},'All news')});
  assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/href="\/updates"/);
});

test('Informational pages retain all published copy and clearly distinguish unfinished content',async()=>{
  const {PublicPage}=await component('app/components/public-page.tsx');const {publicPages}=await component('app/content/public-pages.ts');
  for(const key of ['community','servers','about','safety']){
    const page=publicPages[key],html=render(PublicPage,{content:page});
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    for(const section of page.sections){assert.ok(html.includes(section.title));assert.ok(html.includes(section.text));}
    assert.equal((html.match(/CONTENT NOT YET PUBLISHED/g)||[]).length,page.sections.filter(s=>s.placeholder).length);
    assert.match(html,/href="\/join"/);assert.match(html,/href="\/"/);
    if(key==='about')assert.match(html,/NEEDS EDITORIAL REVIEW/);
    if(key==='servers')assert.match(html,/v3-cocoa/);
  }
});

test('Public gallery preserves featured ordering, enabled filtering, derivative URLs and credits',async()=>{
  const Gallery=(await component('app/routes/gallery.tsx')).default;
  const item=(id,featured=false,enabled=true)=>({id,title:id,description:'Published description',enabled,featured,alt:'Alt '+id});
  const image=id=>({src:'/media/studio/release/'+id+'/detail',width:1280,height:720,creator:'TEST photographer',requiredCredit:'TEST licence credit',source:'https://example.test/licence'});
  const html=render(Gallery,{loaderData:{entry:{snapshot:{title:'TEST published gallery',body_text:'',items:[item('ordinary'),item('featured',true),item('disabled',false,false)]}},images:{ordinary:image('ordinary'),featured:image('featured'),disabled:image('disabled')}}});
  assert.ok(html.indexOf('Alt featured')<html.indexOf('Alt ordinary'));assert.doesNotMatch(html,/Alt disabled/);
  assert.match(html,/TEST photographer \/ TEST licence credit/);assert.match(html,/href="https:\/\/example.test\/licence"/);assert.doesNotMatch(html,/\/control\/media|\/original/);
  const empty=render(Gallery,{loaderData:{entry:null,images:{}}});assert.match(empty,/No community screenshots are published/);
});

test('Newsroom keeps empty/error states and existing status group hierarchy',async()=>{
  const Updates=(await component('app/routes/updates.tsx')).default;
  const base={announcements:[],events:[],now:Date.now(),demonstration:false,availability:'ready'};
  const empty=render(Updates,{loaderData:base});assert.match(empty,/No published news yet/);assert.match(empty,/No published events yet/);assert.match(empty,/id="events"/);
  const unavailable=render(Updates,{loaderData:{...base,availability:'unavailable'}});assert.match(unavailable,/temporarily unavailable/);assert.doesNotMatch(unavailable,/No published news yet/);
});

test('Homepage banner images reserve their published dimensions before loading',async()=>{
  const Home=(await component('app/routes/home.tsx')).default;
  const banner={id:'TEST banner',title:'TEST banner',image:'/media/studio/release/asset/detail',alt:'TEST banner image',width:1280,height:720,description:'',link:'',linkText:'',credit:'',creditSource:''};
  const html=render(Home,{loaderData:{banners:[banner],announcements:[],events:[],showcase:[],now:Date.now(),demonstration:false,availability:'ready'}});
  assert.match(html,/<img[^>]*alt="TEST banner image"[^>]*width="1280"[^>]*height="720"/);
  assert.match(html,/decoding="async"/);assert.doesNotMatch(html,/\/control\/media/);
});
