import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { PhotonImage } from '@cf-wasm/photon';
import { inspectImage, validateAndPreview, MAX_IMAGE_BYTES } from '../app/lib/media-image.server.ts';
import { uploadMedia, getMedia, listMedia, updateMedia, trashMedia, publicationEligibility, requireMediaStorage } from '../app/lib/media-db.server.ts';
import { authorizeMedia, uploadForm, metadataForm } from '../app/lib/media-access.server.ts';
import { hashToken, staffCsrfToken } from '../app/lib/staff-auth.server.ts';
const origin='https://media.example.test';
const ids={Moderator:'100000000000000001',Administrator:'100000000000000002',Owner:'100000000000000003',Member:'100000000000000004'};
const image=new PhotonImage(new Uint8Array([243,140,62,255,246,240,232,255]),2,1);
const png=image.get_bytes(),jpeg=image.get_bytes_jpeg(85),webp=image.get_bytes_webp();image.free();
function form(bytes=png){const result=new FormData();result.set('image',new File([bytes],'../../fictional-image.html',{type:'text/html'}));result.set('title','Fictional test image');return result;}
async function setup(t){
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:[]});t.after(()=>proxy.dispose());
 const db=proxy.env.CONTENT_DB;
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await db.batch(splitSql(await readFile(`migrations/${name}`,'utf8')).map(sql=>db.prepare(sql)));
 const env={CONTENT_DB:db,MEDIA_BUCKET:proxy.env.MEDIA_BUCKET,DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'fictional-client-secret',AUTH_CSRF_SECRET:'fictional-csrf-secret-at-least-32-characters',CONTROL_ORIGIN:origin};
 const cookies={};
 for(const [role,id] of Object.entries(ids)){
  const raw=id.padEnd(64,'a');cookies[role]=`__Host-cc_session=${raw}`;
  await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id,'fictional_'+role,'Fictional '+role,Date.now(),Date.now()).run();
  if(role!=='Member')await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES (?,?,?,?)').bind(id,role,Date.now(),Date.now()).run();
  await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashToken(raw),id,Date.now(),Date.now()+3600000).run();
 }
 const request=(role,method='GET',extra={},body)=>new Request(origin+'/control/media',{method,headers:{Cookie:cookies[role]||'',...(method==='POST'?{Origin:origin}:{}),...extra},body});
 return {env,db,cookies,request};
}

function pngWithComment(bytes, comment) {
 const content=new TextEncoder().encode('Comment\0'+comment),chunk=new Uint8Array(content.length+12),view=new DataView(chunk.buffer);
 view.setUint32(0,content.length);chunk.set(new TextEncoder().encode('tEXt'),4);chunk.set(content,8);
 let crc=0xffffffff;for(const byte of chunk.subarray(4,-4)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}view.setUint32(chunk.length-4,(crc^0xffffffff)>>>0);
 const result=new Uint8Array(bytes.length+chunk.length);result.set(bytes.subarray(0,-12));result.set(chunk,bytes.length-12);result.set(bytes.subarray(-12),result.length-12);return result;
}

test('file validation performs full decode, rejects unsafe/truncated files and enforces resource limits',async()=>{
 for(const [bytes,mime] of [[png,'image/png'],[jpeg,'image/jpeg'],[webp,'image/webp']]){
  const result=await validateAndPreview(bytes);assert.equal(result.mime,mime);assert.equal(result.width,2);assert.equal(inspectImage(result.preview).mime,'image/png');
 }
 for(const bytes of [new Uint8Array(),new TextEncoder().encode('<svg onload="alert(1)"/>'),new TextEncoder().encode('<html>unsafe</html>'),png.slice(0,-1),new Uint8Array([...png,60,115,99,114,105,112,116]),jpeg.slice(0,-2),webp.slice(0,-1)])await assert.rejects(validateAndPreview(bytes));
 assert.throws(()=>inspectImage(new Uint8Array(MAX_IMAGE_BYTES+1)),/20 MB/);
 const huge=png.slice();new DataView(huge.buffer).setUint32(16,100000);assert.throws(()=>inspectImage(huge),/4096/);
 // Correct envelope/dimensions but corrupted compressed pixels must not pass signature checks.
 const tagged=pngWithComment(png,'fictional-private-location');const sanitized=await validateAndPreview(tagged);assert.ok(Buffer.from(tagged).includes('fictional-private-location'));assert.ok(!Buffer.from(sanitized.preview).includes('fictional-private-location'));
 const corrupt=png.slice();const at=Buffer.from(corrupt).indexOf('IDAT');corrupt[at+4]^=255;await assert.rejects(validateAndPreview(corrupt));
 const pixels=png.slice();new DataView(pixels.buffer).setUint32(16,3000);new DataView(pixels.buffer).setUint32(20,3000);assert.throws(()=>inspectImage(pixels),/4 million/);
 const animated=webp.slice();if(Buffer.from(animated).toString('ascii',12,16)==='VP8X'){animated[20]|=2;assert.throws(()=>inspectImage(animated));}
});

test('private media authorization, CSRF, role revocation, expiration and missing bindings',async t=>{
 const {env,db,request}=await setup(t);
 for(const role of ['', 'Member'])for(const write of [false,true])await assert.rejects(authorizeMedia(request(role,write?'POST':'GET'),env,write),error=>error.status===403);
 for(const role of ['Moderator','Administrator','Owner']){
  const session=await authorizeMedia(request(role),env);assert.equal(session.role,role);
  const csrf=await staffCsrfToken(session,env);
  assert.equal((await authorizeMedia(request(role,'POST',{'X-CSRF-Token':csrf}),env,true)).role,role);
  const encoded=new URLSearchParams({_csrf:csrf,description:'あ'.repeat(4000),provenance:'あ'.repeat(4000)});
  assert.equal((await authorizeMedia(request(role,'POST',{'Content-Type':'application/x-www-form-urlencoded'},encoded),env,true)).role,role);
  for(const headers of [{'X-CSRF-Token':'bad'},{'X-CSRF-Token':csrf,Origin:'https://evil.example'},{'X-CSRF-Token':csrf,'Sec-Fetch-Site':'cross-site'}])await assert.rejects(authorizeMedia(request(role,'POST',headers),env,true),error=>error.status===403);
  await assert.rejects(authorizeMedia(request(role,'POST'),env,true),error=>error.status===403);
 }
 for(const key of ['CONTENT_DB','MEDIA_BUCKET']){
  assert.throws(()=>requireMediaStorage({...env,[key]:undefined}),/not configured/);
  await assert.rejects(authorizeMedia(request('Owner'),{...env,[key]:undefined}),error=>error.status===503);
 }
 await db.prepare('UPDATE site_sessions SET created_at=0,expires_at=1 WHERE discord_user_id=?').bind(ids.Moderator).run();
 await assert.rejects(authorizeMedia(request('Moderator'),env),error=>error.status===403);
 await db.prepare("UPDATE staff_accounts SET active=0 WHERE discord_user_id=?").bind(ids.Administrator).run();
 await assert.rejects(authorizeMedia(request('Administrator'),env),error=>error.status===403);
});

test('local R2/D1 media lifecycle, consent, references, audits, optimistic edits and recovery',async t=>{
 const {env,db,request}=await setup(t),session=await authorizeMedia(request('Moderator'),env),now=Date.now();
 const id=await uploadMedia(env,session,form(),now);
 assert.match(id,/^[a-f0-9-]{36}$/);
 let result=await getMedia(db,id);
 assert.equal(result.asset.mime_type,'image/png');assert.equal(result.asset.original_filename,'fictional-image.html');assert.equal(result.asset.uploaded_by,ids.Moderator);
 assert.equal(result.permissions.length,3);assert.ok(result.permissions.every(p=>p.status==='pending'));
 assert.equal(publicationEligibility(result.asset,result.permissions,'gallery',now).eligible,false);
 assert.equal((await listMedia(db,'fictional')).length,1);assert.equal((await listMedia(db,'unmatched')).length,0);assert.equal((await listMedia(db,'%')).length,0);assert.equal((await listMedia(db,'',false,0,'image/jpeg')).length,0);assert.equal((await listMedia(db,'',false,0,'image/png')).length,1);await assert.rejects(listMedia(db,'',false,0,'text/html'));
 assert.doesNotMatch(JSON.stringify(result),/private\/|original_key|preview_key|sha256|token_hash/);
 const keys=await db.prepare('SELECT original_key,preview_key FROM media_assets WHERE id=?').bind(id).first();
 assert.ok((await env.MEDIA_BUCKET.get(keys.original_key)).size>0);const preview=await env.MEDIA_BUCKET.get(keys.preview_key);assert.equal(inspectImage(new Uint8Array(await preview.arrayBuffer())).mime,'image/png');
 assert.ok(!keys.original_key.includes('fictional-image'));
 const edit=new FormData();edit.set('version','1');edit.set('title','Updated fictional image');edit.set('alt_text','Orange and cream pixels');edit.set('anonymous','on');edit.set('provenance','Created solely for isolated automated tests.');
 edit.set('gallery_status','approved');
 await assert.rejects(updateMedia(db,id,ids.Moderator,edit,now+1),/rights holder/);
 edit.set('gallery_rights_holder','Fictional rights holder');edit.set('gallery_evidence','TEST ONLY: explicit gallery approval documented by fictional creator.');
 await updateMedia(db,id,ids.Moderator,edit,now+1);result=await getMedia(db,id);
 assert.equal(result.asset.version,2);assert.equal(result.asset.anonymous,1);
 assert.equal(publicationEligibility(result.asset,result.permissions,'gallery',now+2).eligible,true);
 for(const purpose of ['homepage','external'])assert.equal(publicationEligibility(result.asset,result.permissions,purpose,now+2).eligible,false);
 assert.equal(publicationEligibility(result.asset,result.permissions.map(p=>({...p,expires_at:now+2})),'gallery',now+2).eligible,false);
 assert.equal(publicationEligibility(result.asset,result.permissions.map(p=>({...p,conditions:'Confirm written credit'})),'gallery',now+2).eligible,false);
 assert.equal(publicationEligibility(result.asset,result.permissions.map(p=>({...p,status:'revoked'})),'gallery',now+2).eligible,false);
 edit.set('title','Stale overwrite');await assert.rejects(updateMedia(db,id,ids.Moderator,edit,now+3),/changed/);
 assert.equal((await getMedia(db,id)).asset.title,'Updated fictional image');
 // Simulate a future publisher reference. Both service and DB prohibit breaking it.
 await db.prepare("INSERT INTO media_usage_references(id,asset_id,purpose,reference_label,created_by,created_at) VALUES ('test-ref',?,'gallery','Fictional content reference',?,?)").bind(id,ids.Owner,now).run();
 await assert.rejects(trashMedia(db,id,ids.Moderator,false,2,now+4),/referenced/);
 await assert.rejects(db.prepare('UPDATE media_assets SET deleted_at=?,deleted_by=?,recover_until=? WHERE id=?').bind(now,ids.Moderator,now+2592000000,id).run());
 await db.prepare("DELETE FROM media_usage_references WHERE id='test-ref'").run();
 await trashMedia(db,id,ids.Moderator,false,2,now+4);result=await getMedia(db,id);
 assert.equal((await listMedia(db)).length,0);assert.equal((await listMedia(db,'',true)).length,1);assert.equal(result.asset.recover_until,now+4+2592000000);
 assert.equal(publicationEligibility(result.asset,result.permissions,'gallery',now+5).eligible,false);
 await assert.rejects(db.prepare("INSERT INTO media_usage_references(id,asset_id,purpose,reference_label,created_by,created_at) VALUES ('trashed-ref',?,'gallery','Unavailable image',?,?)").bind(id,ids.Owner,now).run());
 await assert.rejects(trashMedia(db,id,ids.Moderator,true,3,now+5+2592000000),/expired/);
 await trashMedia(db,id,ids.Moderator,true,3,now+5);
 assert.equal((await getMedia(db,id)).asset.deleted_at,null);assert.equal((await listMedia(db)).length,1);
 await assert.rejects(db.prepare('DELETE FROM media_assets WHERE id=?').bind(id).run());
 const audits=(await db.prepare("SELECT details_json FROM audit_records WHERE json_extract(details_json,'$.entity')='media' ORDER BY created_at").all()).results.map(row=>JSON.parse(row.details_json));
 assert.deepEqual(audits.map(row=>row.operation),['uploaded','metadata','trashed','restored']);assert.equal(audits[1].after.permissions[0].status,'approved');
 // Force metadata failure after R2 writes, verify compensation and D1 batch rollback.
 await db.exec("CREATE TRIGGER fail_media_test BEFORE INSERT ON audit_records WHEN json_extract(NEW.details_json,'$.operation')='uploaded' BEGIN SELECT RAISE(ABORT,'test failure'); END;");
 const before=(await env.MEDIA_BUCKET.list()).objects.length;await assert.rejects(uploadMedia(env,session,form(),now+6),/could not be saved/);
 assert.equal((await env.MEDIA_BUCKET.list()).objects.length,before);assert.equal((await listMedia(db)).length,1);
});

test('upload parser bounds streamed bodies and rejects malformed multipart',async()=>{
 const sample=form();const request=new Request(origin,{method:'POST',body:sample});const parsed=await uploadForm(request);assert.equal(parsed.get('title'),'Fictional test image');
 await assert.rejects(uploadForm(new Request(origin,{method:'POST',body:'bad'})),/media form/);
 await assert.rejects(uploadForm(new Request(origin,{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test','Content-Length':'999999999'},body:'x'})),/20 MB/);
 const oversizedMetadata=new Request(origin,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'description='+ 'x'.repeat(262144)});await assert.rejects(metadataForm(oversizedMetadata),/too large/);
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES+65537));controller.close();}});
 await assert.rejects(uploadForm(new Request(origin,{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test'},body:stream,duplex:'half'})),/20 MB/);
});
