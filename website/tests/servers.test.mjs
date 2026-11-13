import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {build} from 'esbuild';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import {publicServers,isServerImage} from '../app/content/servers.ts';

async function component(path) {
 const result=await build({entryPoints:[path],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
 const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),console,Date,Intl,Response,URL});return module.exports;
}
const render=(Component,path='/servers',props={})=>renderToStaticMarkup(h(MemoryRouter,{initialEntries:[path]},h(Component,props)));

test('server catalog publishes only approved visible entries with explicit public fields',()=>{
 const [server]=publicServers();assert.equal(server.slug,'create');assert.equal(publicServers().length,1);
 const candidate={...server,ownerApproved:true,visibility:'public',privateNetwork:'TEST PRIVATE NETWORK',token:'TEST SECRET',image:{...server.image,privateKey:'TEST PRIVATE IMAGE'}};
 const data=publicServers([candidate,{...candidate,id:'hidden',slug:'hidden',visibility:'hidden'},{...candidate,id:'unapproved',slug:'unapproved',ownerApproved:false},{...candidate,slug:'../private'}]);
 assert.equal(data.length,1);assert.equal(data[0].detailsHref,'/servers/create');
 assert.doesNotMatch(JSON.stringify(data),/TEST PRIVATE|TEST SECRET|privateNetwork|privateKey|ownerApproved|visibility/);
 assert.equal(publicServers([{...candidate,image:undefined}])[0].image,undefined);
});

test('server artwork rejects private previews, originals and external URLs',()=>{
 const image=publicServers()[0].image;
 for(const src of ['/control/media/private/preview','https://example.test/image.jpg','//example.test/a.jpg','/images/../private.png','/media/studio/a/b/original']){
  assert.equal(isServerImage({...image,src}),false,src);
 }
 assert.equal(isServerImage({...image,alt:''}),false);
 assert.equal(isServerImage(image),true);
 assert.equal(isServerImage({...image,src:'/media/studio/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/detail'}),true);
});

test('Servers hub features the single confirmed server without advertising future launches or status',async()=>{
 const Hub=(await component('app/routes/servers.tsx')).default;
 const html=render(Hub);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/Different worlds/);assert.match(html,/One community/);
 assert.match(html,/Carrott&#x27;s Create Server/);assert.match(html,/href="\/servers\/create"/);assert.match(html,/Explore Server/);assert.match(html,/href="\/join"/);
 assert.match(html,/not a community screenshot/);assert.match(html,/<img[^>]+alt="Illustrated mechanical workshop/);
 assert.doesNotMatch(html,/Satisfactory|Homestead|coming soon|players online|uptime|\b(?:\d{1,3}\.){3}\d{1,3}\b|tailscale\.com\/invite|\/control\/media/);
});

test('Create details explain private onboarding, unverified requirements and honest server moments',async()=>{
 const Detail=(await component('app/routes/servers-create.tsx')).default;
 const html=render(Detail,'/servers/create');
 assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal((html.match(/<ol\b/g)||[]).length,1);
 assert.match(html,/Tailscale/);assert.match(html,/whitelist/);assert.match(html,/does not automatically grant access/);
 assert.match(html,/Exact modpack/);assert.match(html,/Not published here yet/);assert.match(html,/No server screenshot published yet/);
 assert.match(html,/href="\/servers"/);assert.match(html,/href="\/safety"/);assert.match(html,/href="#getting-started"/);
 assert.doesNotMatch(html,/minecraft:\/\/|tailscale\.com\/invite|Satisfactory|Homestead|\/control\/media|\b(?:\d{1,3}\.){3}\d{1,3}\b|[a-z0-9-]+\.ts\.net/);
});

test('Servers navigation stays active on the child route and does not activate other sections',async()=>{
 const {Header}=await component('app/components/community.tsx');
 const html=render(Header,'/servers/create');
 assert.match(html,/<a[^>]*aria-current="page"[^>]*href="\/servers"[^>]*>Servers<\/a>/);
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(html,/aria-controls="main-nav"/);assert.match(html,/href="\/login"/);
});

test('reusable server card remains game-neutral and preserves image credit/fallback',async()=>{
 const {ServerCard,ServerArtwork}=await component('app/components/server-card.tsx');
 const sample={...publicServers()[0],id:'test-game',slug:'test-game',name:'TEST confirmed game',game:'TEST Game',description:'TEST approved description',featured:false,detailsHref:'/servers/test-game',image:undefined};
 const html=render(ServerCard,'/servers',{server:sample});assert.match(html,/TEST Game/);assert.doesNotMatch(html,/Minecraft|Create machinery|<img/);assert.match(html,/No server screenshot/);
 const image={...publicServers()[0].image,requiredCredit:'TEST mandatory attribution'};
 assert.match(render(ServerArtwork,'/servers',{image}),/TEST mandatory attribution/);
 assert.doesNotMatch(render(ServerArtwork,'/servers',{image:{...image,src:'/control/media/private/preview'}}),/src="\/control/);
});

test('historical context stays separate from current Create imagery with stable lazy responsive media',async()=>{
 const Hub=(await component('app/routes/servers.tsx')).default,html=render(Hub);
 assert.match(html,/v3-server-history/);assert.match(html,/not the current Create server/);assert.match(html,/Date, server name and builder are unconfirmed/);
 assert.match(html,/<img[^>]*src="\/images\/historical-minecraft\/historical-tree-settlement-800.jpg"[^>]*srcSet=[^>]*width="1600" height="900" loading="lazy"/);
 assert.doesNotMatch(html,/Server%20Photos|IMG_0505|unknown.png|New Icon.png/);
});
