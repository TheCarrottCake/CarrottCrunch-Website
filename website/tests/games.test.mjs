import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {build} from 'esbuild';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import postcss from 'postcss';
import {communityGames,previewGames} from '../app/content/games.ts';
async function component(path){const result=await build({entryPoints:[path],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),console,Date,Intl,Response,URL});return module.exports;}
const render=(Component,props={},path='/games')=>renderToStaticMarkup(h(MemoryRouter,{initialEntries:[path]},h(Component,props)));

test('community catalog retains six confirmed games, genres and the sole Minecraft hosted server',()=>{
 assert.deepEqual(communityGames.map(g=>g.title),['Minecraft','R.E.P.O.','Phasmophobia','Overwatch','Roblox','Satisfactory']);
 assert.equal(new Set(communityGames.map(g=>g.id)).size,6);assert.ok(communityGames.every(g=>g.description));
 assert.deepEqual(communityGames.map(g=>g.genres),[['Sandbox','Survival','Building'],['Co-op','Horror'],['Co-op','Ghost hunting'],['Competitive','Team shooter'],['Social','Variety'],['Automation','Factory building']]);
 assert.deepEqual(communityGames.filter(g=>g.hostedServer).map(g=>g.id),['minecraft']);assert.equal(communityGames[0].hostedServer.href,'/servers/create');
 assert.deepEqual(previewGames().map(g=>g.id),['minecraft','repo','phasmophobia']);
});

test('every game has its own original CSS theme without artwork references or rights requirements',()=>{
 assert.deepEqual(communityGames.map(g=>g.theme),['blocks','cargo','radar','team','modules','conveyor']);
 for(const game of communityGames){assert.equal('artwork' in game,false);assert.equal('src' in game,false);}
 assert.doesNotMatch(JSON.stringify(communityGames),/https:|game-assets|permission|licen[cs]e|publisherLogo/);
});

test('Games directory presents six semantic titles with hidden decoration and no third-party imagery',async()=>{
 const Games=(await component('app/routes/games.tsx')).default,html=render(Games);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal((html.match(/<article\b/g)||[]).length,6);assert.equal((html.match(/<h3\b/g)||[]).length,6);
 assert.equal((html.match(/class="v3-game-motif" aria-hidden="true"/g)||[]).length,6);
 assert.doesNotMatch(html,/<img|<svg|<canvas|Artwork &amp; Acknowledgements|copyright|Artwork source|coming soon|players online|most popular/);
 assert.equal((html.match(/href="\/servers\/create"/g)||[]).length,1);assert.match(html,/CarrottCrunch-hosted Create server/);assert.match(html,/community play/);
});

test('homepage preview remains single Section 03 after Hangout with its exact three games',async()=>{
 const {GamesPreview}=await component('app/components/games-preview.tsx');const html=render(GamesPreview,{},'/');
 assert.equal((html.match(/<article\b/g)||[]).length,3);assert.match(html,/What We&#x27;re Playing/);assert.match(html,/Explore All Games/);assert.match(html,/href="\/games"/);
 assert.doesNotMatch(html,/Satisfactory|Overwatch|Roblox|most popular|<img/);assert.match(html,/03 \/<\/span>/);assert.match(html,/id="games"/);
 const home=await readFile('app/routes/home.tsx','utf8');assert.equal((home.match(/<GamesPreview\/>/g)||[]).length,1);assert.ok(home.indexOf('<GamesPreview/>')>home.indexOf('id="hangout"'));assert.ok(home.indexOf('<GamesPreview/>')<home.indexOf('id="gallery"'));assert.ok(home.indexOf('id="server"')>home.indexOf('id="news"'));assert.match(home,/number="04" eyebrow="A GLIMPSE/);assert.match(home,/number="05" eyebrow="FROM THE COMMUNITY/);assert.match(home,/<CommunityHero/);
});

test('Games navigation and Servers integration retain account and hosted-server paths',async()=>{
 const {Header}=await component('app/components/community.tsx');const html=render(Header,{},'/games');
 assert.match(html,/<a[^>]*aria-current="page"[^>]*href="\/games"[^>]*>Games<\/a>/);assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 for(const path of ['/servers','/login','/join'])assert.ok(html.includes(`href="${path}"`));
 const Servers=(await component('app/routes/servers.tsx')).default;assert.match(render(Servers,{},'/servers'),/Beyond the Servers/);assert.match(render(Servers,{},'/servers'),/href="\/games"/);
});

test('informational cards add no fake buttons or tab stops and only Minecraft exposes a real action',async()=>{
 const {GameCard}=await component('app/components/game-card.tsx');
 for(const game of communityGames){const html=render(GameCard,{game});assert.doesNotMatch(html,/<button|tabindex=|role="button"|role="img"/);assert.equal((html.match(/<a\b/g)||[]).length,game.hostedServer?1:0);assert.ok(html.includes(`aria-labelledby="game-${game.id}"`));}
});

test('retired Games-only legal UI is absent while unrelated homepage credits remain supported',async()=>{
 const home=await readFile('app/routes/home.tsx','utf8');const games=await readFile('app/routes/games.tsx','utf8');
 assert.doesNotMatch(home+games,/GameArtworkCredits|game-artwork-credits|game-assets/);
 assert.match(home,/banner.credit/);assert.match(home,/banner.creditSource/);assert.match(home,/<DiscordWidget/);
});

test('original Games CSS stays scoped and loads no external images, logos or fonts',async()=>{
 const css=await readFile('app/games.css','utf8');const sheet=postcss.parse(css);
 sheet.walkRules(rule=>{for(const selector of postcss.list.comma(rule.selector))assert.match(selector,/^\.public-v3 \.v3-/);});
 assert.doesNotMatch(css,/url\(|@import|@font-face|@keyframes/);
 assert.ok(sheet.nodes.some(n=>n.type==='atrule'&&n.params==='(prefers-reduced-motion: reduce)'));
});
