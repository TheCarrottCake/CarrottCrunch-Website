import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {getPlatformProxy,unstable_splitSqlQuery as splitSql} from 'wrangler';
import {PhotonImage} from '@cf-wasm/photon';
import {studioSave,studioGet,studioAction} from '../app/lib/studio.server.ts';
import {uploadMedia} from '../app/lib/media-db.server.ts';
import {deliverStudioImage} from '../app/lib/studio-media.server.ts';

for(const variant of ['early-applied-0011','late-draft-0011'])test(`0012 upgrades ${variant} without changing existing content, media or history`,async t=>{
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:['tests/fixtures/empty-env.txt']});t.after(()=>proxy.dispose());
 const db=proxy.env.CONTENT_DB,env={CONTENT_DB:db,MEDIA_BUCKET:proxy.env.MEDIA_BUCKET};
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')&&n<'0011').sort())await db.batch(splitSql(await readFile('migrations/'+name,'utf8')).map(sql=>db.prepare(sql)));
 let schema=await readFile('migrations/0011_content_studio_v2.sql','utf8');
 if(variant==='early-applied-0011'){
  // These are the precise schema differences found through read-only inspection
  // of the existing local database. Never use real staff/content data as fixtures.
  schema=schema.replace(/ALTER TABLE media_assets ADD COLUMN public_release_after[^\n]*\n/,'');
  for(const name of ['studio_media_rights_change','studio_release_execution_once','studio_live_binding'])schema=schema.replace(new RegExp(`CREATE TRIGGER ${name}[\\s\\S]*?END;\\n`),'');
  schema=schema.replace(' OR a.public_release_after>=NEW.created_at','').replace(' OR a.public_release_after>=r.created_at','');
 }
 await db.batch(splitSql(schema).map(sql=>db.prepare(sql)));
 const actor={discord_user_id:'100000000000000001',role:'Moderator'};await db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,'Moderator',1,1)").bind(actor.discord_user_id).run();
 const pixel=new PhotonImage(new Uint8Array([108,128,86,255]),1,1),form=new FormData();form.set('image',new File([pixel.get_bytes()],'TEST preserved.png'));pixel.free();form.set('title','TEST preserved');const asset=await uploadMedia(env,actor,form);
 const id=await studioSave(env,actor,null,'announcement',{title:'TEST preserved post',body_text:'TEST immutable body',coverId:asset},0,true),before=await studioGet(db,id);
 const inventory=async()=>Object.fromEntries(await Promise.all(['studio_documents','studio_revisions','studio_releases','studio_media_references','media_assets','media_editorial_derivatives','audit_records'].map(async table=>[table,(await db.prepare(`SELECT count(*) n FROM ${table}`).first()).n])));
 if(variant==='late-draft-0011')await db.prepare('UPDATE media_assets SET public_release_after=? WHERE id=?').bind(Date.now(),asset).run();
 const counts=await inventory(),originals=(await env.MEDIA_BUCKET.list()).objects.map(object=>object.key).sort();
 await db.batch(splitSql(await readFile('migrations/0012_studio_release_safeguards.sql','utf8')).map(sql=>db.prepare(sql)));
 assert.deepEqual(await inventory(),counts);assert.deepEqual(await studioGet(db,id),before);assert.deepEqual((await env.MEDIA_BUCKET.list()).objects.map(object=>object.key).sort(),originals);
 const image=release=>deliverStudioImage(new Request('https://test.example/media'),env,release,asset,'detail');assert.equal((await image(before.document.live_release_id)).status,variant==='late-draft-0011'?404:200,'Existing draft-era release cutoffs remain effective');
 await assert.rejects(db.prepare('UPDATE studio_releases SET executed_at=executed_at+1 WHERE id=?').bind(before.document.live_release_id).run(),/immutable/);
 const other=await studioSave(env,actor,null,'announcement',{title:'TEST other',body_text:'TEST'},0);await assert.rejects(db.prepare('UPDATE studio_documents SET live_release_id=? WHERE id=?').bind(before.document.live_release_id,other).run(),/belong/);
 await db.prepare('UPDATE media_assets SET publication_blocked=1 WHERE id=?').bind(asset).run();assert.equal((await image(before.document.live_release_id)).status,404);
 await db.prepare('UPDATE media_assets SET publication_blocked=0 WHERE id=?').bind(asset).run();assert.equal((await image(before.document.live_release_id)).status,404);
 await new Promise(resolve=>setTimeout(resolve,10));await studioAction(env,actor,id,before.document.version,'publish');assert.equal((await image((await studioGet(db,id)).document.live_release_id)).status,200);
});
