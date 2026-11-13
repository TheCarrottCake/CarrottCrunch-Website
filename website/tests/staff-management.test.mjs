import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {getPlatformProxy,unstable_splitSqlQuery as splitSql} from 'wrangler';
import {hashToken,staffCsrfToken,currentSiteSession} from '../app/lib/staff-auth.server.ts';
import {managementSession,staffRoster,staffAdminHistory,changeStaffAccess,parseStaffChange} from '../app/lib/staff-management.server.ts';
const ids={owner:'100000000000000001',admin:'100000000000000002',mod:'100000000000000003',member:'100000000000000004',second:'100000000000000005'};
const origin='https://staff.example.test';
const fails=(status)=>e=>e.status===status||status===403&&e.code==='denied';
test('Staff Management: permissions, atomic audit, concurrency, stale sessions and private projection',async t=>{
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:['tests/fixtures/empty-env.txt']});t.after(()=>proxy.dispose());const db=proxy.env.CONTENT_DB;
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await db.batch(splitSql(await readFile('migrations/'+name,'utf8')).map(s=>db.prepare(s)));
 const env={CONTENT_DB:db,CONTROL_ORIGIN:origin,DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'fictional-test-secret',AUTH_CSRF_SECRET:'fictional-csrf-secret-at-least-32-bytes'};
 const actors={};
 async function signin(key){const raw=(Object.keys(ids).indexOf(key)+1).toString().repeat(64),token_hash=await hashToken(raw),now=Date.now();await db.prepare('INSERT OR REPLACE INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(token_hash,ids[key],now,now+3600000).run();const cookie='__Host-cc_session='+raw;return {cookie,token_hash,csrf:await staffCsrfToken({token_hash},env)};}
 for(const [key,id] of Object.entries(ids)){await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,'TEST '+key,'TEST '+key,Date.now(),Date.now()).run();if(key!=='member')await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,?,?,?)').bind(id,key==='owner'||key==='second'?'Owner':key==='admin'?'Administrator':'Moderator',Date.now(),Date.now()).run();actors[key]=await signin(key);}
 const request=(key,post=false,fields={},headers={})=>new Request(origin+'/control/staff',{method:post?'POST':'GET',headers:{Cookie:actors[key]?.cookie||'',...(post?{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'}:{}),...headers},...(post?{body:new URLSearchParams({_csrf:actors[key]?.csrf||'',...fields})}:{})});
 const owner=await managementSession(request('owner'),env),second=await managementSession(request('second'),env);
 const change=(target,version,role='Moderator',active=true,grant=false)=>({target:ids[target],version,role,active,grant});
 await t.test('Owner manages; Administrator reads only; member/Moderator/anonymous denied',async()=>{
  assert.equal((await managementSession(request('admin'),env)).role,'Administrator');
  for(const key of ['admin','mod','member','unknown'])await assert.rejects(managementSession(request(key,true),env,true),fails(403));
  for(const key of ['mod','member','unknown'])await assert.rejects(managementSession(request(key),env),fails(403));
  const roster=await staffRoster(env,false);assert.doesNotMatch(JSON.stringify(roster),/100000000000000|access_version|token_hash|created_at/);assert.equal('id' in roster.items[0],false);
 });
 await t.test('POST requires same origin, CSRF and explicit unambiguous confirmation',async()=>{
  await assert.rejects(managementSession(request('owner',true,{}, {Origin:'https://other.example'}),env,true),e=>e.code==='csrf');
  await assert.rejects(managementSession(request('owner',true,{_csrf:'bad'}),env,true),e=>e.code==='csrf');
  await assert.rejects(managementSession(request('owner',true,{}, {'Sec-Fetch-Site':'cross-site'}),env,true),e=>e.code==='csrf');
  const form=new FormData();for(const [k,v] of Object.entries({target:ids.mod,version:'1',role:'Administrator',active:'1',intent:'update'}))form.set(k,v);
  assert.throws(()=>parseStaffChange(form));form.set('confirm','yes');assert.equal(parseStaffChange(form).role,'Administrator');form.append('role','Owner');assert.throws(()=>parseStaffChange(form));
 });
 await t.test('existing member grant is audited atomically and revokes prior sessions',async()=>{
  await changeStaffAccess(env,owner,change('member',0,'Moderator',true,true));
  assert.equal(await currentSiteSession(request('member'),env),null);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM site_users WHERE discord_user_id=?').bind(ids.member).first()).n,1);
  const h=await staffAdminHistory(env);assert.equal(h.length,1);assert.equal(h[0].actor,'TEST owner');assert.equal(JSON.parse(h[0].after).role,'Moderator');
  await assert.rejects(db.prepare('UPDATE audit_records SET actor_id=?').bind('changed').run(),/append-only/);
 });
 await t.test('concurrent edits allow exactly one change and one immutable audit; member account survives',async()=>{
  const before=(await staffAdminHistory(env)).length;
  const results=await Promise.allSettled([changeStaffAccess(env,owner,change('mod',1,'Administrator')),changeStaffAccess(env,owner,change('mod',1,'Moderator',false))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);
  assert.equal((await staffAdminHistory(env)).length,before+1);assert.equal(await currentSiteSession(request('mod'),env),null);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM site_users WHERE discord_user_id=?').bind(ids.mod).first()).n,1);
 });
 await t.test('stale Owner sessions cannot write after deactivation/reactivation and last Owner/self are protected',async()=>{
  await assert.rejects(changeStaffAccess(env,owner,change('owner',1,'Moderator',false)),/own staff access/);
  await changeStaffAccess(env,owner,change('second',1,'Moderator',false));
  await assert.rejects(changeStaffAccess(env,second,change('admin',1,'Moderator',false)),fails(409));
  await assert.rejects(managementSession(request('second'),env),fails(403));
  await changeStaffAccess(env,owner,change('second',2,'Moderator',true));
  await assert.rejects(changeStaffAccess(env,second,change('admin',1,'Moderator',false)),fails(409));
  // Remove the current actor session after authentication: SQL must still fail closed.
  await db.prepare('DELETE FROM site_sessions WHERE token_hash=?').bind(owner.token_hash).run();
  await assert.rejects(changeStaffAccess(env,owner,change('admin',1,'Moderator',false)),fails(409));
  // Simulate an already-stale Owner snapshot while only one Owner remains active.
  await db.prepare('UPDATE staff_accounts SET active=0 WHERE discord_user_id=?').bind(ids.second).run();actors.owner=await signin('owner');
  const stale={...owner,discord_user_id:ids.second,token_hash:owner.token_hash};
  await assert.rejects(changeStaffAccess(env,stale,change('owner',1,'Moderator',false)),fails(409));
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM staff_accounts WHERE role='Owner' AND active=1").first()).n,1);
 });
 await t.test('simultaneous Owners disabling each other leave exactly one active Owner',async()=>{
  await db.prepare('UPDATE staff_accounts SET active=1 WHERE discord_user_id IN (?,?)').bind(ids.owner,ids.second).run();
  actors.owner=await signin('owner');actors.second=await signin('second');
  const one=await managementSession(request('owner'),env),two=await managementSession(request('second'),env);
  const rows=(await db.prepare("SELECT discord_user_id,access_version FROM staff_accounts WHERE role='Owner'").all()).results;
  const version=id=>rows.find(r=>r.discord_user_id===id).access_version;
  const result=await Promise.allSettled([changeStaffAccess(env,one,change('second',version(ids.second),'Moderator',false)),changeStaffAccess(env,two,change('owner',version(ids.owner),'Moderator',false))]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM staff_accounts WHERE role='Owner' AND active=1").first()).n,1);
  await db.prepare('UPDATE staff_accounts SET active=1 WHERE discord_user_id=?').bind(ids.owner).run();
 });
 await t.test('forged Owner role grants, unknown accounts and audit failure cannot change access',async()=>{
  actors.owner=await signin('owner');const live=await managementSession(request('owner'),env);
  await assert.rejects(changeStaffAccess(env,live,{...change('admin',1),role:'Owner'}),fails(400));
  await assert.rejects(changeStaffAccess(env,live,{...change('member',0),grant:true,target:'999999999999999999'}),fails(409));
  await db.prepare("CREATE TRIGGER test_audit_failure BEFORE INSERT ON audit_records BEGIN SELECT RAISE(ABORT,'TEST AUDIT FAIL'); END").run();
  await assert.rejects(changeStaffAccess(env,live,change('admin',1,'Moderator',false)),/TEST AUDIT FAIL/);
  assert.equal((await db.prepare('SELECT active,access_version FROM staff_accounts WHERE discord_user_id=?').bind(ids.admin).first()).active,1);
  assert.ok(await currentSiteSession(request('admin'),env));
 });
});
