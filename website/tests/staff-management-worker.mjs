// Current built Worker; synthetic identities and disposable D1/R2 only.
import assert from 'node:assert/strict';
import {aboutRuntime} from './fixtures/about-memories-runtime.mjs';
import {hashToken,staffCsrfToken} from '../app/lib/staff-auth.server.ts';
const r=await aboutRuntime();
try{
 const owner='100000000000000002',admin='100000000000000003',member='100000000000000004';const people={};
 for(const [index,id] of [owner,admin,member].entries()){
  const now=Date.now(),raw=String(index+2).repeat(64),token_hash=await hashToken(raw);
  await r.db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,'TEST user '+index,'TEST Name '+index,now,now).run();
  if(id!==member)await r.db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,?,?,?)').bind(id,id===owner?'Owner':'Administrator',now,now).run();
  await r.db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(token_hash,id,now,now+3600000).run();people[id]={cookie:'__Host-cc_session='+raw,csrf:await staffCsrfToken({token_hash},r.env)};
 }
 const read=(cookie)=>r.request('/control/staff',{headers:{Cookie:cookie||''},redirect:'manual'});
 const post=(id,values,extra={})=>r.request('/control/staff',{method:'POST',redirect:'manual',headers:{Cookie:people[id].cookie,Origin:r.origin,'Content-Type':'application/x-www-form-urlencoded',...extra},body:new URLSearchParams({_csrf:people[id].csrf,...values})});
 for(const cookie of ['',r.cookie,people[member].cookie]){const res=await read(cookie);assert.equal(res.status,403);assert.doesNotMatch(await res.text(),/TEST Name|TEST moderator|Staff roster|name="target"/);assert.match(res.headers.get('Cache-Control'),/no-store/);}
 const adminResponse=await read(people[admin].cookie),adminHtml=await adminResponse.text();assert.equal(adminResponse.status,200);assert.match(adminHtml,/Read-only staff roster/);assert.doesNotMatch(adminHtml,/name="target"|Staff administration history|Assign staff access|10000000000000000/);assert.match(adminResponse.headers.get('Cache-Control'),/private, no-store/);assert.match(adminResponse.headers.get('Vary'),/Cookie/);
 const values={target:member,version:'0',role:'Moderator',active:'1',intent:'grant',confirm:'yes'};
 assert.equal((await post(admin,values)).status,403);
 assert.equal((await post(owner,values,{Origin:'https://bad.example'})).status,400); // React Router rejects cross-origin document POST before the action.
 assert.equal((await post(owner,{...values,_csrf:'bad'})).status,403);
 assert.equal((await post(owner,{...values,confirm:'no'})).status,400);
 const ownerHtml=await(await read(people[owner].cookie)).text();assert.match(ownerHtml,/Staff administration history/);assert.match(ownerHtml,/name="confirm"/);assert.match(ownerHtml,/You cannot change your own access/);
 assert.equal((await post(owner,values)).status,200);assert.equal((await post(owner,values)).status,409);
 assert.equal((await read(people[member].cookie)).status,403); // prior member session invalidated by grant
 const refreshed=await(await read(people[owner].cookie)).text();assert.match(refreshed,/Assigned staff access/);assert.match(refreshed,/TEST Name 2/);
 for(const path of ['/','/games','/servers','/servers/create','/about','/gallery','/safety','/login']){const res=await r.request(path);assert.equal(res.status,200);assert.doesNotMatch(await res.text(),/TEST Name|100000000000000002|staff-administration|Staff administration history/);}
 console.log('Staff Management Worker passed: route permissions, private headers, read-only roster, confirmations, CSRF, atomic grant/conflict, session invalidation and public isolation.');
}finally{await r.mf.dispose();}
