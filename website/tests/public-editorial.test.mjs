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
      b.onLoad({filter:/.*/,namespace:'server-stub'},()=>({contents:'export const contentEnvironmentContext={},studioPublic=()=>{},studioImages=()=>{},loadPublicContent=()=>{},publicContentSource=()=>{},getPublishedAnnouncement=()=>{},getPublicStaffVoices=()=>[];'}));
    }
  }]});
  const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),console,Date,Intl,Response,URL});return module.exports;
}
const render=(Component,props)=>renderToStaticMarkup(h(MemoryRouter,null,h(Component,props)));

test('Editorial headers support optional context without images or unsafe title HTML',async()=>{
  const {EditorialHeader}=await component('app/components/public-page.tsx');
  const html=render(EditorialHeader,{title:'<script>Title</script>',accent:'.',eyebrow:'SECTION',description:'Introduction',children:h('a',{href:'/updates'},'All news')});
  assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/href="\/updates"/);
});

test('Informational pages retain all published copy and clearly distinguish unfinished content',async()=>{
  const {PublicPage}=await component('app/components/public-page.tsx');const {publicPages}=await component('app/content/public-pages.ts');
  for(const key of ['community','servers','safety']){
    const page=publicPages[key],html=render(PublicPage,{content:page});
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    for(const section of page.sections){assert.ok(html.includes(section.title));assert.ok(html.includes(section.text));}
    assert.equal((html.match(/CONTENT NOT YET PUBLISHED/g)||[]).length,page.sections.filter(s=>s.placeholder).length);
    assert.match(html,/href="\/join"/);assert.match(html,/href="\/"/);
    if(key==='servers')assert.match(html,/v3-cocoa/);
  }
});

test('About preserves the approved history and founder message with honest memory placeholders',async()=>{
  const About=(await component('app/routes/about.tsx')).default;
  const {publicPages}=await component('app/content/public-pages.ts');
  const html=render(About,{}),page=publicPages.about;
  const escaped=text=>renderToStaticMarkup(h('span',null,text)).slice(6,-7);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal((html.match(/<h2\b/g)||[]).length,3);
  assert.match(html,/<h1>About <span class="v3-page-accent">CarrottCrunch\.<\/span><\/h1>/);
  assert.ok(html.includes(escaped(page.description)));
  for(const section of page.sections){assert.ok(html.includes(section.title));for(const paragraph of section.text.split('\n\n'))assert.ok(html.includes(escaped(paragraph)),paragraph);}
  assert.match(html,/class="v3-about-founder v3-cocoa"/);
  assert.ok(html.includes(escaped("Hey! I'm Carrott!")));assert.match(html,/TheCarrottCake · Founder of CarrottCrunch/);
  assert.match(html,/<strong>Come for the games\. Stay for the people\.<\/strong>/);assert.match(html,/<strong>See you around!<\/strong>/);
  assert.match(html,/href="\/join"/);assert.match(html,/href="\/servers"/);
  assert.doesNotMatch(html,/NEEDS EDITORIAL REVIEW|Brand artwork|not been published/i);
  assert.equal((html.match(/Awaiting a real historical image\./g)||[]).length,2);
  assert.match(html,/not a complete timeline/);
  for(const name of ["The Boop&#x27;s Discord",'CarrottCrazeHQ','The Rooted Realm','CarrottCrunch'])assert.ok(html.includes(name));
  assert.match(html,/src="\/branding\/TCC_Logo_Icon_Only\.svg"/);
  assert.doesNotMatch(html,/TCC_Logo_Master|<blockquote|\/images\//);
  for(const index of [0,1,2])assert.match(html,new RegExp(`id="about-section-${index}"`));
});

test('Public gallery preserves featured ordering, enabled filtering, derivative URLs and credits',async()=>{
  const Gallery=(await component('app/routes/gallery.tsx')).default;
  const item=(id,featured=false,enabled=true)=>({id,title:id,description:'Published description',enabled,featured,alt:'Alt '+id});
  const image=id=>({src:'/media/studio/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/'+(id==='ordinary'?'11111111':id==='featured'?'22222222':'33333333')+'-1111-4111-8111-111111111111/detail',width:1280,height:720,creator:'TEST photographer',requiredCredit:'TEST licence credit',source:'https://example.test/licence'});
  const html=render(Gallery,{loaderData:{entry:{snapshot:{title:'TEST published gallery',body_text:'',items:[item('ordinary'),item('featured',true),item('disabled',false,false)]}},images:{ordinary:image('ordinary'),featured:image('featured'),disabled:image('disabled')}}});
  assert.ok(html.indexOf('Alt featured')<html.indexOf('Alt ordinary'));assert.doesNotMatch(html,/Alt disabled/);
  assert.match(html,/TEST photographer \/ TEST licence credit/);assert.match(html,/data-featured="true"/);assert.match(html,/View full image:/);assert.match(html,/href="https:\/\/example.test\/licence"/);assert.doesNotMatch(html,/\/control\/media|\/original/);
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

test('Gallery handles a published empty collection and missing or private image sources',async()=>{
  const Gallery=(await component('app/routes/gallery.tsx')).default;
  const snapshot={title:'TEST collection',body_text:'',items:[]};
  assert.match(render(Gallery,{loaderData:{entry:{snapshot},images:{}}}),/No community screenshots are published/);
  const item={id:'TEST item',title:'TEST missing creation',description:'Text stays visible',enabled:true,featured:true,alt:'TEST image'};
  const html=render(Gallery,{loaderData:{entry:{snapshot:{...snapshot,items:[item]}},images:{'TEST item':{src:'/control/media/private/preview',creator:'PRIVATE',requiredCredit:'',source:''}}}});
  assert.match(html,/Image unavailable/);assert.match(html,/Text stays visible/);assert.doesNotMatch(html,/src="\/control|PRIVATE|View full image:/);
});

test('Staff voices are empty until supplied and consented; public projection excludes private fields',async()=>{
  const {projectStaffVoices,getPublicStaffVoices}=await component('app/content/staff-voices.server.ts');
  const {StaffVoices}=await component('app/components/staff-voices.tsx');
  assert.equal(getPublicStaffVoices().length,0);assert.equal(render(StaffVoices,{contributions:[]}), '');
  const portrait={src:'/media/studio/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/detail',alt:'TEST consented portrait',width:1280,height:720,requiredCredit:'TEST portrait credit',source:'https://example.test/licence'};
  const named={displayName:'TEST volunteer',roleLabel:'TEST role',message:'TEST explicitly supplied message',portrait,discordId:'PRIVATE ID',consent:{message:true,name:true}};
  const publicNamed=projectStaffVoices([named]);assert.equal(publicNamed[0].displayName,'TEST volunteer');assert.equal(publicNamed[0].roleLabel,undefined);assert.equal(publicNamed[0].portrait,undefined);assert.doesNotMatch(JSON.stringify(publicNamed),/PRIVATE|discordId|consent/);
  assert.equal(projectStaffVoices([{...named,consent:{message:false,name:true}}]).length,0);
  const anonymous=projectStaffVoices([{...named,anonymous:true,consent:{message:true,name:true,role:true,portrait:true}}]);
  assert.deepEqual(JSON.parse(JSON.stringify(anonymous)),[{anonymous:true,displayName:'Staff member',message:named.message}]);
  assert.doesNotMatch(render(StaffVoices,{contributions:anonymous}),/TEST volunteer|TEST role|portrait|PRIVATE/);
  const approved=projectStaffVoices([{...named,consent:{message:true,name:true,role:true,portrait:true}}]);const html=render(StaffVoices,{contributions:approved});
  assert.match(html,/<blockquote>/);assert.match(html,/TEST role/);assert.match(html,/TEST portrait credit/);assert.match(html,/href="https:\/\/example.test\/licence"/);
  assert.doesNotMatch(JSON.stringify(projectStaffVoices([{...named,portrait:{...portrait,src:'https://cdn.discordapp.com/private-avatar'},consent:{message:true,name:true,portrait:true}}])),/cdn.discordapp.com/);
});
