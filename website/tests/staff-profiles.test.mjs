import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {getPlatformProxy,unstable_splitSqlQuery as splitSql} from 'wrangler';
import {PhotonImage} from '@cf-wasm/photon';
import {uploadMedia} from '../app/lib/media-db.server.ts';
import {hashToken} from '../app/lib/staff-auth.server.ts';
import {profilesReady,ownProfile,saveProfile,consentProfile,withdrawProfile,publishProfile,profileConsent,publicStaffDirectory,deliverProfilePortrait} from '../app/lib/staff-profiles.server.ts';
const consent={name:true,role:true,biography:true,portrait:false};
test('Staff Directory: additive proposed schema, exact consent, publication/privacy, races and portraits',async t=>{
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:['tests/fixtures/empty-env.txt']});t.after(()=>proxy.dispose());const db=proxy.env.CONTENT_DB,env={CONTENT_DB:db,MEDIA_BUCKET:proxy.env.MEDIA_BUCKET};
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await db.batch(splitSql(await readFile('migrations/'+name,'utf8')).map(s=>db.prepare(s)));
 const actors=[];
 for(const [i,role] of ['Moderator','Administrator','Owner'].entries()){const id='10000000000000000'+(i+1),raw=String(i+1).repeat(64),token_hash=await hashToken(raw),now=Date.now();await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,'PRIVATE username '+i,'PRIVATE account '+i,now,now).run();await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,?,?,?)').bind(id,role,now,now).run();await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(token_hash,id,now,now+3600000).run();actors.push({discord_user_id:id,role,username:'PRIVATE user',display_name:'PRIVATE account',token_hash,avatar_ref:null});}
 const [mod,admin,owner]=actors;
 await t.test('unapplied migration fails closed; additive draft preserves existing rows',async()=>{
  assert.equal(await profilesReady(db),false);assert.deepEqual(await publicStaffDirectory(env),{ready:false,profiles:[]});
  await assert.rejects(saveProfile(env,mod,0,{displayName:'TEST',biography:'',portrait:'',portraitAlt:''}),e=>e.status===503);
  const before=await db.prepare('SELECT * FROM staff_accounts ORDER BY discord_user_id').all();
  await db.batch(splitSql(await readFile('docs/proposed-migrations/0014_staff_profiles.sql','utf8')).map(s=>db.prepare(s)));
  assert.deepEqual((await db.prepare('SELECT * FROM staff_accounts ORDER BY discord_user_id').all()).results,before.results);assert.equal(await profilesReady(db),true);
  assert.deepEqual((await publicStaffDirectory(env)).profiles,[]);
 });
 const draft={displayName:'TEST Public Name',biography:'TEST public biography',portrait:'',portraitAlt:''};
 await t.test('private draft has no inferred account name/avatar/role or public visibility',async()=>{
  await saveProfile(env,mod,0,draft);const p=await ownProfile(env,mod);assert.notEqual(p.public_id,mod.discord_user_id);assert.equal(p.consent_id,null);assert.equal(p.live_release_id,null);assert.deepEqual((await publicStaffDirectory(env)).profiles,[]);
  await saveProfile(env,admin,0,{...draft,displayName:'TEST Other Profile'});assert.equal((await ownProfile(env,mod)).display_name,draft.displayName);
 });
 await t.test('field-specific consent snapshots omit unselected biography; only publishers publish',async()=>{
  let p=await ownProfile(env,mod);await assert.rejects(consentProfile(env,mod,p.version,{...consent,role:false}),e=>e.status===400);
  await consentProfile(env,mod,p.version,{...consent,biography:false});p=await ownProfile(env,mod);const c=await profileConsent(env,p.consent_id);assert.equal(c.biography,'');assert.equal(c.role,'Moderator');
  await assert.rejects(publishProfile(env,mod,p.public_id,p.version,c.id),e=>e.status===403);
  await publishProfile(env,admin,p.public_id,p.version,c.id);
  const pub=(await publicStaffDirectory(env)).profiles;assert.equal(pub.length,1);assert.equal(pub[0].biography,'');assert.equal(pub[0].portrait,null);assert.equal(pub[0].role,'Moderator');assert.doesNotMatch(JSON.stringify(pub),/10000000000000000|PRIVATE|actor_id|consent|token_hash|asset_id|version/);
  await assert.rejects(db.prepare('UPDATE staff_profile_consents SET display_name=?').bind('changed').run(),/append-only/);
 });
 await t.test('edits clear consent/publication and concurrent saves reject stale input',async()=>{
  let p=await ownProfile(env,mod);const result=await Promise.allSettled([saveProfile(env,mod,p.version,{...draft,displayName:'TEST First'}),saveProfile(env,mod,p.version,{...draft,displayName:'TEST Second'})]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);assert.equal((await publicStaffDirectory(env)).profiles.length,0);p=await ownProfile(env,mod);assert.equal(p.consent_id,null);
 });
 async function publishMod(){let p=await ownProfile(env,mod);await consentProfile(env,mod,p.version,consent);p=await ownProfile(env,mod);await publishProfile(env,owner,p.public_id,p.version,p.consent_id);return ownProfile(env,mod);}
 await t.test('withdrawal wins over stale publication attempts; old consent cannot return',async()=>{
  const p=await publishMod();await withdrawProfile(env,mod);assert.equal((await publicStaffDirectory(env)).profiles.length,0);await assert.rejects(publishProfile(env,owner,p.public_id,p.version,p.consent_id),e=>e.status===409);
 });
 await t.test('role/deactivation changes clear consent permanently, even after access returns',async()=>{
  await publishMod();await db.prepare("UPDATE staff_accounts SET role='Administrator' WHERE discord_user_id=?").bind(mod.discord_user_id).run();assert.equal((await publicStaffDirectory(env)).profiles.length,0);assert.equal((await ownProfile(env,mod)).consent_id,null);
  await db.prepare("UPDATE staff_accounts SET role='Moderator' WHERE discord_user_id=?").bind(mod.discord_user_id).run();assert.equal((await publicStaffDirectory(env)).profiles.length,0);
  // Re-authenticate synthetic user after the real role trigger invalidates old sessions.
  await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(mod.token_hash,mod.discord_user_id,Date.now(),Date.now()+3600000).run();await publishMod();
  await db.prepare('UPDATE staff_accounts SET active=0 WHERE discord_user_id=?').bind(mod.discord_user_id).run();assert.equal((await publicStaffDirectory(env)).profiles.length,0);await db.prepare('UPDATE staff_accounts SET active=1 WHERE discord_user_id=?').bind(mod.discord_user_id).run();assert.equal((await publicStaffDirectory(env)).profiles.length,0);
  await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(mod.token_hash,mod.discord_user_id,Date.now(),Date.now()+3600000).run();
 });
 await t.test('portrait requires consent, rights/integrity and exact current public release; never originals',async()=>{
  const pixel=new PhotonImage(new Uint8Array([130,150,90,255]),1,1),form=new FormData();form.set('image',new File([pixel.get_bytes()],'TEST-portrait.png'));pixel.free();form.set('title','TEST portrait');form.set('alt_text','TEST portrait');const asset=await uploadMedia(env,mod,form);
  let p=await ownProfile(env,mod);await saveProfile(env,mod,p.version,{...draft,portrait:asset,portraitAlt:'TEST approved portrait'});p=await ownProfile(env,mod);await consentProfile(env,mod,p.version,{...consent,portrait:true});p=await ownProfile(env,mod);await publishProfile(env,owner,p.public_id,p.version,p.consent_id);
  const pub=(await publicStaffDirectory(env)).profiles[0];assert.ok(pub.portrait);assert.ok(!pub.portrait.src.includes(asset));const req=new Request('https://test.example'+pub.portrait.src);
  let response=await deliverProfilePortrait(req,env,p.public_id,(await ownProfile(env,mod)).live_release_id);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');assert.ok((await response.arrayBuffer()).byteLength>0);
  assert.equal((await deliverProfilePortrait(new Request(req.url+'?original=1'),env,p.public_id,(await ownProfile(env,mod)).live_release_id)).status,404);
  await assert.rejects(db.prepare('UPDATE media_assets SET deleted_at=? WHERE id=?').bind(Date.now(),asset).run(),/referenced by a staff profile/);
  const oldRelease=(await ownProfile(env,mod)).live_release_id;
  await db.prepare('UPDATE media_assets SET publication_blocked=1 WHERE id=?').bind(asset).run();
  assert.equal((await deliverProfilePortrait(req,env,p.public_id,oldRelease)).status,404);assert.equal((await publicStaffDirectory(env)).profiles[0].portrait,null);
  await db.prepare('UPDATE media_assets SET publication_blocked=0 WHERE id=?').bind(asset).run();assert.equal((await deliverProfilePortrait(req,env,p.public_id,oldRelease)).status,404);
  const release=(await ownProfile(env,mod)).live_release_id;await withdrawProfile(env,mod);assert.equal((await deliverProfilePortrait(req,env,p.public_id,release)).status,404);
  p=await ownProfile(env,mod);await consentProfile(env,mod,p.version,{...consent,portrait:true});p=await ownProfile(env,mod);await db.prepare('UPDATE media_assets SET publication_blocked=1 WHERE id=?').bind(asset).run();await assert.rejects(publishProfile(env,owner,p.public_id,p.version,p.consent_id),e=>e.status===409);
 });
 await t.test('stale publisher session and audit-write failure fail closed without partial saves',async()=>{
  let p=await ownProfile(env,admin);await consentProfile(env,admin,p.version,consent);p=await ownProfile(env,admin);await db.prepare('DELETE FROM site_sessions WHERE token_hash=?').bind(owner.token_hash).run();await assert.rejects(publishProfile(env,owner,p.public_id,p.version,p.consent_id),e=>e.status===409);
  await db.prepare("CREATE TRIGGER test_profile_audit_failure BEFORE INSERT ON audit_records BEGIN SELECT RAISE(ABORT,'TEST PROFILE AUDIT FAIL'); END").run();const before=await ownProfile(env,admin);await assert.rejects(saveProfile(env,admin,before.version,{...draft,displayName:'TEST rejected'}),/TEST PROFILE AUDIT FAIL/);assert.equal((await ownProfile(env,admin)).version,before.version);
 });
});
