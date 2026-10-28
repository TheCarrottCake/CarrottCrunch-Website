import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';
import * as jsx from 'react/jsx-runtime';

test('V3 CSS remains isolated from Crunch Control and non-opted-in elements',async()=>{
 const sheet=postcss.parse(await readFile('app/public-v3.css','utf8'));
 sheet.walkRules(rule=>{
  if(rule.parent.type==='atrule'&&rule.parent.name==='keyframes'){assert.equal(rule.parent.params,'v3-hero-zoom');return;}
  for(const selector of postcss.list.comma(rule.selector)){
   assert.match(selector,/^\.public-v3(?:$|\s+\.v3-[\w-]+)/,'Every selector requires the public boundary and an opt-in class');
   if(selector==='.public-v3')rule.walkDecls(declaration=>assert.match(declaration.prop,/^--v3-/, 'The boundary may define only new namespaced tokens'));
  }
 });
 sheet.walkAtRules(rule=>{assert.ok(['media','keyframes'].includes(rule.name),'V3 must not load fonts or define global properties');if(rule.name==='keyframes')assert.equal(rule.params,'v3-hero-zoom');});
 const reduced=sheet.nodes.find(node=>node.type==='atrule'&&node.params==='(prefers-reduced-motion: reduce)');assert.ok(reduced);
 const reducedTokens=new Map();reduced.walkDecls(declaration=>reducedTokens.set(declaration.prop,declaration.value));
 for(const name of ['--v3-transition-duration','--v3-crossfade-duration','--v3-zoom-duration'])assert.equal(reducedTokens.get(name),'0ms');
 assert.equal(reducedTokens.get('--v3-media-zoom'),'1');
 const action=sheet.nodes.find(node=>node.selector==='.public-v3 .v3-primary-action');assert.ok(action.nodes.some(node=>node.prop==='background'&&node.value==='var(--accent)'),'Actions must use burnt orange independently of decorative aliases');
});

const nodes=(value,predicate)=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(child=>nodes(child,predicate)):[...(predicate(value)?[value]:[]),...nodes(value.props?.children,predicate)];
const one=(tree,predicate)=>{const found=nodes(tree,predicate);assert.equal(found.length,1);return found[0];};
async function layoutHarness(){
 const refs=[];let cursor=0,effects=[];const location={pathname:'/',hash:''},navigation={state:'idle'};
 const imports={react:{useRef:value=>refs[cursor++]??={current:value},useEffect:callback=>effects.push(callback)},'react/jsx-runtime':jsx,'react-router':{data:value=>value,Outlet:'outlet',useLocation:()=>location,useNavigation:()=>navigation},'../components/community':{Header:'public-header',Footer:'public-footer'},'../public-v3.css':{},'../lib/cloudflare-context.server':{},'../lib/staff-auth.server':{}};
 const module={exports:{}};const source=(await readFile('app/routes/public-layout.tsx','utf8')).replaceAll('import.meta.env.DEV','false');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>{assert.ok(name in imports,name);return imports[name];}});
 return {location,navigation,render(account){cursor=0;effects=[];return module.exports.default({loaderData:{account}});},flush(){for(const effect of effects)effect();},headers:module.exports.headers};
}

test('The V3 public boundary preserves navigation/account props, landmarks, loading and route focus',async()=>{
 const harness=await layoutHarness(),account={displayName:'TEST member',csrf:'TEST fixture'};let tree=harness.render(account),focused=[];
 assert.equal(tree.props.className,'public-v3');assert.equal(one(tree,node=>node.type==='public-header').props.account,account);assert.equal(nodes(tree,node=>node.type==='public-footer').length,1);
 assert.equal(one(tree,node=>node.props?.className==='skip-link').props.href,'#main');assert.equal(nodes(tree,node=>node.props?.id==='page-top').length,1);
 const main=one(tree,node=>node.type==='main');assert.equal(main.props.id,'main');assert.equal(main.props.tabIndex,-1);main.props.ref.current={focus:options=>focused.push(options.preventScroll)};harness.flush();assert.equal(focused.length,0);
 harness.location.pathname='/gallery';tree=harness.render(account);harness.flush();assert.deepEqual(focused,[true]);
 harness.location.pathname='/updates';harness.location.hash='#events';tree=harness.render(account);harness.flush();assert.deepEqual(focused,[true],'Hash navigation must retain its anchor behaviour');
 harness.navigation.state='loading';tree=harness.render(account);assert.equal(one(tree,node=>node.type==='main').props['aria-busy'],true);assert.match(one(tree,node=>node.props?.role==='status').props.children,/Loading page/);
 assert.equal(harness.headers()['Cache-Control'],'private, no-store');assert.equal(harness.headers().Vary,'Cookie');
});
