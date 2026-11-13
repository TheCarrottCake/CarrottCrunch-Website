import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {unstable_splitSqlQuery as splitSql} from 'wrangler';
import {aboutRuntime} from './fixtures/about-memories-runtime.mjs';
import {hashToken,staffCsrfToken} from '../app/lib/staff-auth.server.ts';
const r=await aboutRuntime();
try{
 const admin='100000000000000002',member='100000000000000003',people={};
 for(const [i,id] of [admin,member].entries()){const now=Date.now(),raw=String(i+4).repeat(64),token_hash=await hashToken(raw);await r.db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,'PRIVATE account '+i,'PRIVATE Account '+i,now,now).run();if(id===admin)await r.db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,'Administrator',?,?)").bind(id,now,now).run();await r.db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(token_hash,id,now,now+3600000).run();people[id]={cookie:'__Host-cc_session='+raw,csrf:await staffCsrfToken({token_hash},r.env)};}
 const mod={cookie:r.cookie,csrf:r.csrf};
 const read=(person,path='/control/staff-profiles')=>r.request(path,{headers:person?{Cookie:person.cookie}:{},redirect:'manual'});
 const post=(person,values,headers={})=>r.request('/control/staff-profiles',{method:'POST',redirect:'manual',headers:{Cookie:person.cookie,Origin:r.origin,'Content-Type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams({_csrf:person.csrf,...values})});
 for(const who of [null,people[member]])assert.equal((await read(who)).status,403);
 let response=await read(mod);assert.equal(response.status,200);assert.match(await response.text(),/awaiting owner approval/);assert.match(response.headers.get('Cache-Control'),/private, no-store/);
 assert.match(await(await read(null,'/community/staff')).text(),/directory is not available yet/);
 await r.db.batch(splitSql(await readFile('docs/proposed-migrations/0014_staff_profiles.sql','utf8')).map(s=>r.db.prepare(s)));
 assert.match(await(await read(null,'/community/staff')).text(),/No public staff profiles/);
 assert.equal((await post(mod,{intent:'save',version:'0',displayName:'TEST Public Moderator',biography:'PRIVATE draft biography',portrait:'',portraitAlt:'',owner_id:admin,role:'Owner'})).status,200);
 let p=await r.db.prepare('SELECT * FROM staff_profiles WHERE owner_id=?').bind(r.actor).first();assert.ok(p);assert.equal(await r.db.prepare('SELECT public_id FROM staff_profiles WHERE owner_id=?').bind(admin).first(),null);
 assert.doesNotMatch(await(await read(null,'/community/staff')).text(),/TEST Public Moderator|PRIVATE draft/);
 assert.equal((await post(mod,{intent:'consent',version:p.version,consentName:'yes'})).status,400);
 assert.equal((await post(mod,{intent:'consent',version:p.version,consentName:'yes',consentRole:'yes'})).status,200);
 p=await r.db.prepare('SELECT * FROM staff_profiles WHERE owner_id=?').bind(r.actor).first();
 const publication={intent:'publish',version:p.version,profile:p.public_id,consent:p.consent_id,confirm:'yes'};
 assert.equal((await post(mod,publication)).status,403);
 assert.equal((await post(people[admin],{...publication,_csrf:'bad'})).status,403);
 assert.equal((await post(people[admin],publication,{Origin:'https://bad.example'})).status,400);
 assert.equal((await post(people[admin],publication)).status,200);
 let html=await(await read(null,'/community/staff')).text();assert.match(html,/TEST Public Moderator/);assert.match(html,/Moderator/);assert.doesNotMatch(html,/100000000000000001|PRIVATE|owner_id|consent_id|audit_records|portrait_asset|access_version/);
 assert.doesNotMatch(await(await read(mod)).text(),/Profile publication/);assert.match(await(await read(people[admin])).text(),/Profile publication/);
 assert.equal((await post(mod,{intent:'withdraw',version:'0',confirm:'yes'})).status,200);
 assert.doesNotMatch(await(await read(null,'/community/staff')).text(),/TEST Public Moderator/);
 // An Administrator can edit only their own draft; forged owner_id/role are ignored.
 assert.equal((await post(people[admin],{intent:'save',version:'0',displayName:'TEST Admin Profile',biography:'',owner_id:r.actor,role:'Owner'})).status,200);
 assert.equal((await r.db.prepare('SELECT display_name FROM staff_profiles WHERE owner_id=?').bind(r.actor).first()).display_name,'TEST Public Moderator');
 for(const path of ['/','/community','/games','/servers','/servers/create','/about','/gallery','/safety','/login']){const res=await read(null,path);assert.equal(res.status,200,path);assert.doesNotMatch(await res.text(),/PRIVATE account|owner_id|consent_id/);}
 console.log('Staff Profiles built Worker passed: schema-off/on, own-only edits, derived roles, consent, publisher permissions, CSRF, withdrawal and public isolation.');
}finally{await r.mf.dispose();}
