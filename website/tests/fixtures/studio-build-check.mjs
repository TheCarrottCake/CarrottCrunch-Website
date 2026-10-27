import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {beginDiscordLogin,finishDiscordLogin} from '../../app/lib/staff-auth.server.ts';

export async function verifyStudioBuild(build,db){
 const origin='https://staff.example.test',env={CONTENT_DB:db,CONTROL_ORIGIN:origin,DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'fictional-client-secret',AUTH_CSRF_SECRET:'fictional-csrf-secret-32-characters-long',INITIAL_OWNER_DISCORD_ID:'100000000000000001'},context={get:()=>env};
 const route=name=>build.routes['routes/'+name].module;
 for(const name of ['login','account','control','studio-posts','studio-new','studio-post','studio-library','studio-collection'])assert.equal(new Headers(route(name).headers()).get('Referrer-Policy'),'same-origin');
 for(const name of ['control-review','control-workflow','control-news-new','control-events-new','control-content-image','control-media-picker'])assert.equal(build.routes['routes/'+name],undefined,'Obsolete workflow routes are not registered');
 for(const name of ['studio-posts','studio-library','studio-collection'])await assert.rejects(route(name).loader({request:new Request(origin+'/control/posts'),context,params:{kind:'homepage'}}),e=>e.status===403);
 const login=async(id,username)=>{const start=await beginDiscordLogin(new Request(origin+'/auth/start',{method:'POST',headers:{Origin:origin}}),env),state=new URL(start.headers.get('Location')).searchParams.get('state');const response=await finishDiscordLogin(new Request(`${origin}/control/auth/callback?state=${state}&code=test-code`,{headers:{Cookie:start.headers.getSetCookie()[0].split(';')[0]}}),env,false,async input=>String(input).endsWith('/token/revoke')?new Response(null):String(input).endsWith('/token')?Response.json({access_token:'fictional-access-token',token_type:'Bearer',scope:'identify',expires_in:3600}):Response.json({id,username,global_name:username}));return response.headers.getSetCookie().map(v=>v.split(';')[0]).filter(v=>!v.endsWith('=')).join('; ');};
 const cookie=await login(env.INITIAL_OWNER_DISCORD_ID,'TEST owner'),request=path=>new Request(origin+path,{headers:{Cookie:cookie}});
 const owner=(await route('control').loader({request:request('/control'),context,params:{}})).data;
 assert.equal(owner.role,'Owner');assert.deepEqual(Object.keys(owner).sort(),['csrf','identity','role']);assert.doesNotMatch(JSON.stringify(owner),/token_hash|discord_user_id|access_token|client_secret/);
 const fields={intent:'save',version:'0',snapshot:JSON.stringify({title:'TEST built draft',body_text:'TEST body'})};
 const post=(values,csrf=owner.csrf)=>new Request(origin+'/control/posts/new/announcement',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:csrf,...values})});
 const args={context,params:{kind:'announcement'}};
 assert.equal((await route('studio-new').action({...args,request:post(fields,'bad')})).init.status,403);
 const created=await route('studio-new').action({...args,request:post(fields)});assert.equal(created.status,303);const id=created.headers.get('Location').split('/').at(-1).split('?')[0];
 const loaded=(await route('studio-post').loader({request:request('/control/posts/'+id),context,params:{documentId:id}})).data;assert.equal(loaded.history.length,1);
 assert.doesNotMatch(JSON.stringify(loaded),/actor_id|discord_user_id|token_hash|client_secret/);
 await assert.rejects(route('news-article').loader({request:new Request(origin+'/updates/'+id),context,params:{announcementId:id}}),e=>e.status===404);
 const {studioSave}=await import('../../app/lib/studio.server.ts');for(let index=0;index<25;index++)await studioSave(env,{discord_user_id:env.INITIAL_OWNER_DISCORD_ID,role:'Owner'},null,'announcement',{title:'TEST pagination '+index,body_text:'TEST'},0);
 const page=async offset=>(await route('studio-posts').loader({request:request('/control/posts?q=TEST%20pagination&offset='+offset),context,params:{}})).data;const first=await page(0),second=await page(24);assert.equal(first.items.length,24);assert.equal(first.more,true);assert.equal(second.items.length,1);assert.equal(second.more,false);assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,25);
 const member=await login('100000000000000002','TEST member'),memberRequest=new Request(origin+'/account',{headers:{Cookie:member}});
 assert.equal((await route('account').loader({request:memberRequest,context,params:{}})).data.account.canAccessControl,false);
 for(const name of ['studio-posts','studio-library','studio-collection'])await assert.rejects(route(name).loader({request:memberRequest,context,params:{kind:'homepage'}}),e=>e.status===403);
 const logout=await route('control-logout').action({request:new Request(origin+'/control/logout',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:owner.csrf})}),context,params:{}});assert.equal(logout.status,303);
 await assert.rejects(route('control').loader({request:request('/control'),context,params:{}}),e=>e.status===302);
 for(const name of (await readdir('build/client/assets')).filter(n=>n.endsWith('.js')))assert.doesNotMatch(await readFile('build/client/assets/'+name,'utf8'),/DISCORD_CLIENT_SECRET|AUTH_CSRF_SECRET|staff_oauth_transactions|site_sessions/);
 console.log('V2 built-route checks passed: route retirement, private headers, mocked OAuth, Owner/member permissions, CSRF, draft isolation, immutable history and logout revocation.');
}
