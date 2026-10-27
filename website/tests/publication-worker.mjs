// Built application Worker, isolated local workerd/D1. Scheduled dispatch does not use HTTP.
import assert from 'node:assert/strict';
import { readdir,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare,convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery as splitSql } from 'wrangler';
import { createEventDraft } from '../app/lib/content-db.server.ts';
import { getWorkflow,changeWorkflow } from '../app/lib/publication-workflow.server.ts';
import { hashToken,staffCsrfToken } from '../app/lib/staff-auth.server.ts';
const name='publication-integration',origin='https://publication.example.test';
const env={CONTROL_ORIGIN:origin,DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'fictional-client-secret',AUTH_CSRF_SECRET:'fictional-csrf-secret-at-least-32-bytes'};
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name,modules:[{type:'ESModule',path:resolve('build/server/index.js')},...(await readdir('build/server/assets')).filter(f=>/\.(js|wasm)$/.test(f)).map(f=>({type:f.endsWith('.wasm')?'CompiledWasm':'ESModule',path:resolve('build/server/assets',f)}))],compatibilityDate:'2026-10-06',bindings:env,d1Databases:{CONTENT_DB:'publication-worker-test'}}]}));
try{
 const db=await mf.getD1Database('CONTENT_DB',name),actor={id:'100000000000000001',name:'TEST ONLY owner',role:'Owner'};
 for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.batch(splitSql(await readFile(`migrations/${f}`,'utf8')).map(sql=>db.prepare(sql)));
 await db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,'Owner',1,1)").bind(actor.id).run();
 const id=await createEventDraft(db,{slug:'test-cron-event',title:'TEST ONLY cron event',bodyText:'TEST ONLY private body',actorId:actor.id,startsAt:2000000000000,endsAt:2000003600000,timezone:'America/Toronto'});
 const act=async(intent,options={},now=Date.now())=>{const w=await getWorkflow(db,id);await changeWorkflow(db,id,intent,w.editorial_revision,w.version,actor,options,now);};
 const now=Date.now();await act('approve-schedule',{dueAt:now-1000},now-2000);
 const worker=await mf.getWorker(name);
 await Promise.all([worker.scheduled({cron:'* * * * *',scheduledTime:now}),worker.scheduled({cron:'* * * * *',scheduledTime:now})]);
 assert.equal((await getWorkflow(db,id)).status,'published');
 assert.equal((await db.prepare("SELECT count(*) n FROM audit_records WHERE content_id=? AND json_extract(details_json,'$.intent')='scheduled-publication'").bind(id).first()).n,1);
 // First visitor arrives only AFTER scheduled execution has completed.
 const response=await mf.dispatchFetch(origin+'/updates');assert.equal(response.status,200);assert.match(await response.text(),/TEST ONLY cron event/);
 await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,?,?,1,1)').bind(actor.id,actor.name,actor.name).run();
 const raw='b'.repeat(64),token_hash=await hashToken(raw);await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(token_hash,actor.id,Date.now(),Date.now()+3600000).run();const csrf=await staffCsrfToken({token_hash},env),cookie=`__Host-cc_session=${raw}`;
 const url=origin+'/control/workflow/'+id;assert.equal((await mf.dispatchFetch(url)).status,403);
 const page=await mf.dispatchFetch(url,{headers:{Cookie:cookie}});assert.equal(page.status,200);assert.match(await page.text(),/Review &amp; publication/);
 const w=await getWorkflow(db,id);const post=(fields,headers={})=>mf.dispatchFetch(url,{method:'POST',redirect:'manual',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams({_csrf:csrf,intent:'unpublish',revision:String(w.editorial_revision),version:String(w.version),...fields})});
 assert.equal((await post({_csrf:'bad'})).status,403);
 // React Router rejects cross-origin document actions before our own 403 CSRF guard.
 assert.equal((await post({}, {Origin:'https://evil.test'})).status,400);assert.equal((await post({})).status,303);assert.equal((await post({})).status,409);
 assert.doesNotMatch(await (await mf.dispatchFetch(origin+'/updates')).text(),/TEST ONLY cron event/);
 console.log('Built workerd scheduling passed: visitor-independent Cron, overlapping invocation deduplication, approved event visibility, protected workflow HTTP, CSRF, unpublish and stale conflict.');
}finally{await mf.dispose();}
