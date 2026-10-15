// Post-build HTTP integration in real workerd with isolated, non-persistent D1/R2.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_splitSqlQuery as splitSql } from 'wrangler';
import { PhotonImage } from '@cf-wasm/photon';
import { hashToken, staffCsrfToken } from '../app/lib/staff-auth.server.ts';
const origin='https://media.example.test',actor='100000000000000001',raw='a'.repeat(64),cookie=`__Host-cc_session=${raw}`;
const env={CONTROL_ORIGIN:origin,DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'fictional-client-secret',AUTH_CSRF_SECRET:'fictional-test-csrf-secret-32-bytes-long'};
const worker=new Miniflare(convertV4MiniflareOptions({workers:[{name:'media-integration',modules:[{type:'ESModule',path:resolve('build/server/index.js')},...(await readdir('build/server/assets')).filter(name=>/\.(js|wasm)$/.test(name)).map(name=>({type:name.endsWith('.wasm')?'CompiledWasm':'ESModule',path:resolve('build/server/assets',name)}))],compatibilityDate:'2026-10-06',bindings:env,d1Databases:{CONTENT_DB:'media-worker-test'},r2Buckets:['MEDIA_BUCKET']}]}));
try{
 const db=await worker.getD1Database('CONTENT_DB','media-integration');
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await db.batch(splitSql(await readFile(`migrations/${name}`,'utf8')).map(sql=>db.prepare(sql)));
 const now=Date.now();
 await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(actor,'fictional_staff','Fictional Staff',now,now).run();
 await db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES (?,'Moderator',?,?)").bind(actor,now,now).run();
 const token_hash=await hashToken(raw);await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(token_hash,actor,now,now+3600000).run();
 const csrf=await staffCsrfToken({token_hash},env);
 const request=(path,options={})=>worker.dispatchFetch(origin+path,options);
 for(const path of ['/control/media','/control/media/00000000-0000-0000-0000-000000000000/preview'])assert.equal((await request(path)).status,403);
 const get=path=>request(path,{headers:{Cookie:cookie}});
 const library=await get('/control/media');assert.equal(library.status,200);assert.match(library.headers.get('Cache-Control'),/no-store/);assert.match(await library.text(),/No images in this collection/);
 const image=new PhotonImage(new Uint8Array([243,140,62,255]),1,1),png=image.get_bytes();image.free();
 const form=new FormData();form.set('image',new File([png],'fictional.png',{type:'image/png'}));form.set('title','Fictional Worker image');
 const post=async(body,token=csrf,session=cookie)=>{const encoded=new Request(origin,{method:'POST',body});return request('/control/media/upload',{method:'POST',headers:{Cookie:session,Origin:origin,'X-CSRF-Token':token,'Content-Type':encoded.headers.get('Content-Type')},body:new Uint8Array(await encoded.arrayBuffer())});};
 assert.equal((await post(form,'invalid')).status,403);
 assert.equal((await post(form,csrf,'')).status,403);
 const response=await post(form);assert.equal(response.status,201,await response.clone().text());const {id}=await response.json();
 const preview=await get(`/control/media/${id}/preview`);assert.equal(preview.status,200);assert.equal(preview.headers.get('Content-Type'),'image/png');assert.match(preview.headers.get('Cache-Control'),/no-store/);assert.equal(preview.headers.get('X-Content-Type-Options'),'nosniff');assert.ok((await preview.arrayBuffer()).byteLength>0);
 assert.equal((await request(`/control/media/${id}/preview`)).status,403);
 assert.equal((await get('/control/media/not-an-asset/preview')).status,404);
 const detail=await get(`/control/media/${id}`);assert.equal(detail.status,200);assert.match(await detail.text(),/Independent publication permissions/);
 const mutate=async(intent,version)=>request(`/control/media/${id}`,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:csrf,intent,version:String(version)})});
 assert.equal((await mutate('trash',1)).status,200);assert.notEqual((await db.prepare('SELECT deleted_at FROM media_assets WHERE id=?').bind(id).first()).deleted_at,null);
 assert.equal((await mutate('restore',2)).status,200);assert.equal((await db.prepare('SELECT deleted_at FROM media_assets WHERE id=?').bind(id).first()).deleted_at,null);
 // Revoked staff access cannot use an old cookie, including preview URLs.
 await db.prepare('UPDATE staff_accounts SET active=0 WHERE discord_user_id=?').bind(actor).run();
 for(const path of ['/control/media',`/control/media/${id}`,`/control/media/${id}/preview`])assert.equal((await get(path)).status,403);
 assert.equal((await post(form)).status,403);
 for(const path of ['/','/community','/servers','/gallery','/updates','/about','/safety'])assert.equal((await request(path)).status,200,path);
 const join=await request('/join');assert.equal(join.status,200);assert.match(await join.text(),/href="https:\/\/discord\.gg\/NjBVZH4CgW"/);
 console.log('Built Worker media HTTP checks passed: private WASM upload/preview, CSRF, trash/restore, role revocation, and existing public routes/join.');
}finally{await worker.dispose();}
