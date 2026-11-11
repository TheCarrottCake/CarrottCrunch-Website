import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import {safetyPolicy} from '../app/content/safety.ts';
const escape=text=>renderToStaticMarkup(h('span',null,text)).slice(6,-7);
async function page(){const result=await build({entryPoints:['app/routes/safety.tsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url)});return renderToStaticMarkup(h(MemoryRouter,null,h(module.exports.default)));}
test('Safety renders all approved rules and reporting/accountability paragraphs without weakening the policy',async()=>{
 const html=await page();assert.equal(safetyPolicy.rules.length,7);assert.equal(safetyPolicy.reporting.length,4);assert.equal(safetyPolicy.accountability.length,8);
 for(const rule of safetyPolicy.rules){for(const text of rule.paragraphs)assert.ok(html.includes(escape(text)),text);}
 for(const text of [...safetyPolicy.minecraft,...safetyPolicy.reporting.slice(0,3),...safetyPolicy.accountability])assert.ok(html.includes(escape(text)),text);
 assert.equal(html.split(escape(safetyPolicy.rules[0].paragraphs[0])).length-1,1);
 assert.equal(html.split(escape(safetyPolicy.rules[5].paragraphs[3])).length-1,1);
 assert.match(html,/When reporting a concern, avoid sharing sensitive personal information/);
 for(const title of ['Respect &amp; Behaviour','Play Fair','Keep Chats Enjoyable','Privacy &amp; Account Safety'])assert.ok(html.includes(title));
 assert.match(html,/Contact them privately through Discord/);
 assert.match(html,/CarrottCrunch is an 18\+ community/);assert.match(html,/without a prior warning/);assert.match(html,/appropriate corrective steps will be considered/);
 assert.doesNotMatch(html,/policies have not|not been published|reporting contact.*not available|guaranteed confidentiality|within 24 hours|three.strike|appeal deadline/i);
});
test('Safety section navigation points to labelled sections with a complete heading hierarchy and real destinations',async()=>{
 const html=await page();assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal((html.match(/<h2\b/g)||[]).length,3);assert.equal((html.match(/<h3\b/g)||[]).length,7);
 for(const id of ['community-rules','minecraft','reporting']){assert.ok(html.includes(`href="#${id}"`));assert.ok(html.includes(`aria-labelledby="${id}-title"`));assert.ok(html.includes(`<h2 id="${id}-title"`));}
 assert.match(html,/href="\/servers\/create"/);assert.match(html,/href="\/join"/);assert.match(html,/aria-label="On this Safety page"/);
 assert.doesNotMatch(html,/<form|<input|<textarea|<img|https:\/\/discord|mailto:|100\./);
});
test('Safety is a static public presentation without private services, report systems or animation',async()=>{
 const source=await readFile('app/routes/safety.tsx','utf8'),css=await readFile('app/safety.css','utf8');
 assert.doesNotMatch(source,/export (?:async )?function (?:loader|action)|\.server|fetch\(|dangerouslySetInnerHTML|staff-auth|CONTENT_DB|REPORT_/);
 assert.doesNotMatch(css,/@keyframes|url\(|@import/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/:focus-visible/);
 for(const line of css.split('\n').filter(l=>l.includes('{')&&!l.startsWith('@')))assert.match(line.trim(),/^\.public-v3 \.v3-safety/);
});
