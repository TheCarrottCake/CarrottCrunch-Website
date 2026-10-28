// Fictional, disposable local Worker/D1/R2 fixture. Never opens persistent state.
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {unstable_splitSqlQuery as splitSql} from 'wrangler';
import {hashToken,staffCsrfToken} from '../../app/lib/staff-auth.server.ts';

export async function aboutRuntime({through0012=false}={}) {
 const origin='https://memories.example.test',name='about-memories-test';
 const env={CONTROL_ORIGIN:origin,DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'fictional-client-secret',AUTH_CSRF_SECRET:'fictional-about-test-csrf-secret-32-bytes'};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name,modules:[{type:'ESModule',path:resolve('build/server/index.js')},...(await readdir('build/server/assets')).filter(n=>/\.(js|wasm)$/.test(n)).map(n=>({type:n.endsWith('.wasm')?'CompiledWasm':'ESModule',path:resolve('build/server/assets',n)}))],compatibilityDate:'2026-10-06',bindings:env,d1Databases:{CONTENT_DB:'about-test'},r2Buckets:['MEDIA_BUCKET']}]}));
 try {
  const db=await mf.getD1Database('CONTENT_DB',name),bucket=await mf.getR2Bucket('MEDIA_BUCKET',name);
  for(const f of (await readdir('migrations')).filter(n=>n.endsWith('.sql')&&(!through0012||n<'0013')).sort())await db.batch(splitSql(await readFile('migrations/'+f,'utf8')).map(sql=>db.prepare(sql)));
  const actor='100000000000000001',raw='c'.repeat(64),cookie=`__Host-cc_session=${raw}`,now=Date.now();
  await db.prepare("INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,'TEST moderator','TEST Moderator',?,?)").bind(actor,now,now).run();
  await db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,'Moderator',?,?)").bind(actor,now,now).run();
  const token_hash=await hashToken(raw);await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(token_hash,actor,now,now+3600000).run();
  const csrf=await staffCsrfToken({token_hash},env);
  const request=(path,options={})=>mf.dispatchFetch(origin+path,options);
  const post=(values,token=csrf)=>request('/control/collections/about-memories',{method:'POST',redirect:'manual',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:token,...values})});
  return {mf,name,origin,env,db,bucket,actor,cookie,csrf,request,post};
 }catch(error){await mf.dispose();throw error;}
}
