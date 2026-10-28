import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {getPlatformProxy,unstable_splitSqlQuery as splitSql} from 'wrangler';
import {PhotonImage} from '@cf-wasm/photon';
import {studioSave,studioGet,studioAction} from '../app/lib/studio.server.ts';
import {uploadMedia} from '../app/lib/media-db.server.ts';
import {createAnnouncementDraft} from '../app/lib/content-db.server.ts';

const canonical=rows=>rows.map(row=>JSON.stringify(row)).sort();
async function inventory(db){
  const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name").all()).results;
  return Object.fromEntries(await Promise.all(names.map(async({name})=>[name,canonical((await db.prepare(`SELECT * FROM "${name}"`).all()).results)])));
}
const schema=async db=>(await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all()).results.map(o=>({...o,sql:o.sql?.replaceAll("\r\n","\n")}));

for(const variant of ['early-applied-0011','late-draft-0011'])test(`0013 preserves populated ${variant} data, foreign keys, history and rolls back failed reconstruction`,async t=>{
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:['tests/fixtures/empty-env.txt']});t.after(()=>proxy.dispose());
 const db=proxy.env.CONTENT_DB,env={CONTENT_DB:db,MEDIA_BUCKET:proxy.env.MEDIA_BUCKET};
 const apply=sql=>db.batch(splitSql(sql).map(statement=>db.prepare(statement)));
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')&&n<'0011').sort())await apply(await readFile('migrations/'+name,'utf8'));
 const actor={discord_user_id:'100000000000000001',role:'Owner'};
 await db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,'Owner',1,1)").bind(actor.discord_user_id).run();
 const legacy=await createAnnouncementDraft(db,{slug:'test-memory-migration-legacy',title:'TEST legacy record',summary:'TEST summary',bodyText:'TEST historical source',actorId:actor.discord_user_id});
 let sql=await readFile('migrations/0011_content_studio_v2.sql','utf8');
 if(variant==='early-applied-0011'){
  sql=sql.replace(/ALTER TABLE media_assets ADD COLUMN public_release_after[^\n]*\n/,'');
  for(const name of ['studio_media_rights_change','studio_release_execution_once','studio_live_binding'])sql=sql.replace(new RegExp(`CREATE TRIGGER ${name}[\\s\\S]*?END;\\n`),'');
  sql=sql.replace(' OR a.public_release_after>=NEW.created_at','').replace(' OR a.public_release_after>=r.created_at','');
 }
 await apply(sql);await apply(await readFile('migrations/0012_studio_release_safeguards.sql','utf8'));
 const assets=[];for(const color of [[108,128,86,255],[182,66,35,255]]){const pixel=new PhotonImage(new Uint8Array(color),1,1),form=new FormData();form.set('title','TEST image');form.set('image',new File([pixel.get_bytes()],'TEST-only.png'));pixel.free();assets.push(await uploadMedia(env,actor,form));}
 const live=await studioSave(env,actor,null,'announcement',{title:'TEST live and scheduled',body_text:'TEST live',coverId:assets[0]},0,true);
 let doc=(await studioGet(db,live)).document;await studioSave(env,actor,live,'announcement',{title:'TEST private working',body_text:'TEST private',coverId:assets[1]},doc.version);
 doc=(await studioGet(db,live)).document;await studioAction(env,actor,live,doc.version,'schedule',Date.now()+3600000);
 const archived=await studioSave(env,actor,null,'event',{title:'TEST archived',body_text:'TEST archived body',starts_at:2000000000000,ends_at:2000003600000},0);
 await studioAction(env,actor,archived,(await studioGet(db,archived)).document.version,'archive');
 const unpublished=await studioSave(env,actor,null,'announcement',{title:'TEST unpublished',body_text:'TEST text'},0,true);
 await studioAction(env,actor,unpublished,(await studioGet(db,unpublished)).document.version,'unpublish');
 for(const kind of ['homepage','gallery','banners'])await studioSave(env,actor,null,kind,{title:'TEST '+kind,body_text:'',items:[{id:crypto.randomUUID(),assetId:assets[0],title:'TEST item',description:'TEST',alt:'TEST alt',link:'',linkText:'',enabled:true,featured:false}]},0,kind!=='banners');
 assert.ok(await studioGet(db,legacy));
 const before=await inventory(db),beforeSchema=await schema(db),objects=(await env.MEDIA_BUCKET.list()).objects;
 const bytesBefore=await Promise.all(objects.map(async o=>[o.key,Array.from(new Uint8Array(await (await env.MEDIA_BUCKET.get(o.key)).arrayBuffer()))]));
 const migration=await readFile('migrations/0013_about_memories.sql','utf8');
 for(const marker of ['DROP TABLE studio_documents;','ALTER TABLE studio_documents_about_memories_new RENAME TO studio_documents;']){
  await assert.rejects(apply(migration.replace(marker,marker+'\nSELECT * FROM about_memories_injected_failure;')));
  assert.deepEqual(await inventory(db),before,'Failed migration must preserve every row');assert.deepEqual(await schema(db),beforeSchema,'Failed migration must restore schema objects');
 }
 await apply(migration);
 assert.deepEqual(await inventory(db),before,'All existing table rows remain byte-equivalent JSON values');
 const afterSchema=await schema(db);assert.deepEqual(afterSchema.map(({type,name})=>({type,name})),beforeSchema.map(({type,name})=>({type,name})));
 for(const old of beforeSchema.filter(o=>!['studio_documents','studio_single_collection'].includes(o.name)))assert.deepEqual(afterSchema.find(o=>o.name===old.name),old,'Preserve '+old.name);
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 assert.deepEqual((await db.prepare('PRAGMA quick_check').all()).results,[{quick_check:'ok'}]);
 // D1 forbids full integrity_check. Verify the exact reconstruction separately in SQLite.
 const mirrored=execFileSync('python',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin)
c=sqlite3.connect(':memory:')
for o in p['schema']:
 if o['type']=='table' and o['name'] in p['rows']: c.execute(o['sql'])
for name,rows in p['rows'].items():
 for text in rows:
  row=json.loads(text)
  c.execute('INSERT INTO '+chr(34)+name+chr(34)+' ('+','.join(chr(34)+k+chr(34) for k in row)+') VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
for o in p['schema']:
 if o['type']!='table' and o['sql'] and not o['name'].startswith('_cf_'): c.execute(o['sql'])
c.commit()
c.execute('PRAGMA foreign_keys=ON')
c.executescript('BEGIN;'+p['migration']+'COMMIT;')
assert c.execute('PRAGMA foreign_key_check').fetchall()==[]
assert c.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
print('ok')`],{input:JSON.stringify({schema:beforeSchema,rows:before,migration}),encoding:'utf8'}).trim();
 assert.equal(mirrored,'ok');
 for(const [key,bytes] of bytesBefore)assert.deepEqual(Array.from(new Uint8Array(await (await env.MEDIA_BUCKET.get(key)).arrayBuffer())),bytes);
 const about=crypto.randomUUID();await db.prepare("INSERT INTO studio_documents(id,kind,title,created_at,updated_at) VALUES(?,'about-memories','About memories',1,1)").bind(about).run();
 await assert.rejects(db.prepare("INSERT INTO studio_documents(id,kind,title,created_at,updated_at) VALUES(?,'about-memories','Duplicate',1,1)").bind(crypto.randomUUID()).run(),/UNIQUE/);
 await assert.rejects(db.prepare("INSERT INTO studio_documents(id,kind,title,created_at,updated_at) VALUES(?,'unknown','Unknown',1,1)").bind(crypto.randomUUID()).run(),/CHECK/);
 await assert.rejects(db.prepare('UPDATE studio_revisions SET snapshot_json=? WHERE document_id=?').bind('{}',live).run(),/immutable/);
 await assert.rejects(db.prepare('DELETE FROM studio_releases WHERE document_id=?').bind(live).run(),/retained/);
 await assert.rejects(db.prepare('UPDATE studio_documents SET live_release_id=? WHERE id=?').bind((await studioGet(db,live)).document.live_release_id,about).run(),/belong/);
 await assert.rejects(db.prepare('UPDATE media_assets SET deleted_at=1 WHERE id=?').bind(assets[0]).run(),/used|references/);
});
