import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile,readdir } from 'node:fs/promises';
import { getPlatformProxy,unstable_splitSqlQuery as splitSql } from 'wrangler';
import { createAnnouncementDraft,createEventDraft,getPublishedAnnouncements,getPublishedEvents } from '../app/lib/content-db.server.ts';
import { saveAnnouncementDraft } from '../app/lib/announcement-studio.server.ts';
import { archiveDraft } from '../app/lib/draft-delete.server.ts';
import { changeWorkflow,getWorkflow,sweepPublications,publicationInstant,workflowAction } from '../app/lib/publication-workflow.server.ts';
import { hashToken,staffCsrfToken } from '../app/lib/staff-auth.server.ts';

test('05C local D1 workflow, immutable approvals, release isolation and concurrency',async t=>{
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:['tests/fixtures/empty-env.txt']});t.after(()=>proxy.dispose());const db=proxy.env.CONTENT_DB;
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.batch(splitSql(await readFile(`migrations/${file}`,'utf8')).map(sql=>db.prepare(sql)));
 const owner={id:'100000000000000001',name:'TEST Owner',role:'Owner'},admin={id:'100000000000000002',name:'TEST Administrator',role:'Administrator'},mod={id:'100000000000000003',name:'TEST Moderator',role:'Moderator'};
 for(const a of [owner,admin,mod])await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,?,1,1)').bind(a.id,a.role).run();
 let sequence=0;const draft=async(event=false)=>{const input={slug:`test-workflow-${++sequence}`,title:'TEST ONLY saved title',summary:'TEST ONLY summary',bodyText:'TEST ONLY body',actorId:owner.id};return event?createEventDraft(db,{...input,startsAt:2000000000000,endsAt:2000003600000,timezone:'America/Toronto'}):createAnnouncementDraft(db,input);};
 const act=async(id,intent,actor=owner,options={},now=Date.now())=>{const w=await getWorkflow(db,id);return changeWorkflow(db,id,intent,w.editorial_revision,w.version,actor,options,now);};
 const approve=async(id,actor=owner)=>{await act(id,'submit',actor);await act(id,'approve',actor);};
 const count=async(id)=> (await db.prepare('SELECT count(*) n FROM audit_records WHERE content_id=?').bind(id).first()).n;
 await t.test('explicit self-approval never publishes; exact revision publishes only after separate action',async()=>{
 const id=await draft();await act(id,'submit');await assert.rejects(act(id,'publish'),e=>e.status===409);await act(id,'approve');assert.deepEqual(await getPublishedAnnouncements(db),[]);
 const approval=await db.prepare("SELECT * FROM content_reviews WHERE content_id=? AND action='approved'").bind(id).first();assert.equal(approval.revision,1);assert.equal(approval.actor_id,owner.id);assert.ok(approval.created_at>0);
 await act(id,'publish');assert.equal((await getPublishedAnnouncements(db))[0].title,'TEST ONLY saved title');
 for(const table of ['content_reviews','content_releases','content_revisions','audit_records']){await assert.rejects(db.prepare(`DELETE FROM ${table} WHERE content_id=?`).bind(id).run());await assert.rejects(db.prepare(`UPDATE ${table} SET actor_id='bad' WHERE content_id=?`).bind(id).run());}
 await saveAnnouncementDraft(db,id,{title:'TEST ONLY private replacement',summary:'New summary',bodyText:'New body',revision:'1'},mod.id);
 const w=await getWorkflow(db,id);assert.equal(w.editorial_revision,2);assert.equal(w.approval_id,null);assert.equal(w.status,'draft');assert.ok(w.live_release_id);assert.equal((await getPublishedAnnouncements(db))[0].title,'TEST ONLY saved title');
 await assert.rejects(act(id,'publish'),e=>e.status===409);await assert.rejects(archiveDraft(db,id,'announcement',2,mod.id),e=>e.status===409);
 await approve(id);await act(id,'publish');assert.equal((await getPublishedAnnouncements(db))[0].title,'TEST ONLY private replacement');
 await db.prepare("UPDATE staff_accounts SET role='Moderator' WHERE discord_user_id=?").bind(owner.id).run();assert.equal((await getPublishedAnnouncements(db)).length,1);await db.prepare("UPDATE staff_accounts SET role='Owner' WHERE discord_user_id=?").bind(owner.id).run();
 await act(id,'unpublish');assert.deepEqual(await getPublishedAnnouncements(db),[]);assert.equal((await getWorkflow(db,id)).status,'draft');
 });
 await t.test('rejection explanations, role checks and stale workflow actions',async()=>{
 const id=await draft();await act(id,'submit',mod);const w=await getWorkflow(db,id);await assert.rejects(act(id,'approve',mod),e=>e.status===403);await act(id,'reject',admin,{explanation:'TEST ONLY please revise'});
 assert.equal((await getWorkflow(db,id)).status,'draft');assert.equal((await db.prepare("SELECT explanation FROM content_reviews WHERE content_id=? AND action='rejected'").bind(id).first()).explanation,'TEST ONLY please revise');
 await assert.rejects(changeWorkflow(db,id,'approve',w.editorial_revision,w.version,owner),e=>e.status===409);
 await act(id,'submit',mod);await act(id,'approve',admin);await act(id,'archive',admin);assert.equal((await getWorkflow(db,id)).status,'archived');await assert.rejects(act(id,'submit'),e=>e.status===409);
 });
 await t.test('overlapping scheduled sweeps publish once with one audit; due event is public without a visitor',async()=>{
 const id=await draft(true);await approve(id);const now=Date.now();await act(id,'schedule',owner,{dueAt:now+60000},now);assert.deepEqual(await getPublishedEvents(db,now),[]);await sweepPublications(db,now+59999);assert.deepEqual(await getPublishedEvents(db,now+59999),[]);
 const before=await count(id);const results=await Promise.all([sweepPublications(db,now+120000),sweepPublications(db,now+120000)]);assert.equal(results.reduce((n,r)=>n+r.published,0),1);assert.equal(await count(id),before+1);assert.equal((await getPublishedEvents(db,now+120000))[0].id,id);await sweepPublications(db,now+180000);assert.equal(await count(id),before+1);
 await act(id,'archive',owner,{},now+180001);assert.deepEqual(await getPublishedEvents(db,now+180002),[]);
 });
 await t.test('revoked authorizers, cancelled schedules and edits never execute old authorizations',async()=>{
 const id=await draft();await approve(id);const now=Date.now();await act(id,'schedule',admin,{dueAt:now+60000},now);await db.prepare("UPDATE staff_accounts SET role='Moderator' WHERE discord_user_id=?").bind(admin.id).run();assert.equal((await sweepPublications(db,now+120000)).published,0);assert.equal((await getWorkflow(db,id)).status,'scheduled');
 await db.prepare("UPDATE staff_accounts SET role='Administrator' WHERE discord_user_id=?").bind(admin.id).run();await act(id,'cancel-schedule');assert.equal((await sweepPublications(db,now+120000)).published,0);await act(id,'schedule',owner,{dueAt:now+60000},now);
 await saveAnnouncementDraft(db,id,{title:'TEST ONLY changed',summary:'Changed',bodyText:'Changed body',revision:'1'},mod.id);assert.equal((await getWorkflow(db,id)).pending_release_id,null);assert.equal((await sweepPublications(db,now+120000)).published,0);assert.deepEqual(await getPublishedAnnouncements(db,now+120000),[]);
 });
 await t.test('two simultaneous publications and a save versus publication preserve one exact release',async()=>{
 const id=await draft();await approve(id);const w=await getWorkflow(db,id),before=await count(id);const outcomes=await Promise.allSettled([changeWorkflow(db,id,'publish',1,w.version,owner),changeWorkflow(db,id,'publish',1,w.version,owner)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(await count(id),before+1);
 await act(id,'unpublish');await approve(id);const current=await getWorkflow(db,id);const races=await Promise.allSettled([changeWorkflow(db,id,'publish',1,current.version,owner),saveAnnouncementDraft(db,id,{title:'TEST ONLY race edit',summary:'Race',bodyText:'Race body',revision:'1'},mod.id)]);assert.ok(races.some(r=>r.status==='fulfilled'));const publicRows=await getPublishedAnnouncements(db);assert.ok(publicRows.every(r=>r.title!=='TEST ONLY race edit'));await act(id,'archive');
 });
 await t.test('failed history writes roll back workflow and release authorization',async()=>{
 const id=await draft();await approve(id);const before=await getWorkflow(db,id);await db.prepare("CREATE TRIGGER fail_release_test BEFORE INSERT ON content_releases BEGIN SELECT RAISE(ABORT,'TEST failure'); END").run();await assert.rejects(act(id,'publish'),e=>e.status===409);assert.deepEqual(await getWorkflow(db,id),before);await db.prepare('DROP TRIGGER fail_release_test').run();await act(id,'archive');
 });
 await t.test('Cron audit failure leaves authorization pending for the next successful sweep',async()=>{
 const id=await draft();await approve(id);const now=Date.now();await act(id,'schedule',owner,{dueAt:now+60000},now);
 await db.prepare(`CREATE TRIGGER fail_cron_audit BEFORE INSERT ON audit_records WHEN json_extract(NEW.details_json,'$.executor')='cron' BEGIN SELECT RAISE(ABORT,'TEST cron audit failure'); END`).run();
 assert.equal((await sweepPublications(db,now+120000)).failed,1);assert.equal((await getWorkflow(db,id)).status,'scheduled');assert.equal((await getWorkflow(db,id)).live_release_id,null);
 await db.prepare('DROP TRIGGER fail_cron_audit').run();assert.equal((await sweepPublications(db,now+180000)).published,1);await act(id,'archive',owner,{},now+180001);
 });
 await t.test('combined actions record real submission and explicit exact-revision approval in one transaction',async()=>{
 for(const event of [false,true])for(const status of ['draft','review','approved']){
  const id=await draft(event);if(status!=='draft')await act(id,'submit');if(status==='approved')await act(id,'approve');
  const w=await getWorkflow(db,id);let batches=0;const wrapped={prepare:sql=>db.prepare(sql),batch:statements=>{batches++;return db.batch(statements);}};
  await changeWorkflow(wrapped,id,'approve-publish',1,w.version,owner);assert.equal(batches,1);
  const reviews=(await db.prepare('SELECT action,revision,actor_id FROM content_reviews WHERE content_id=? ORDER BY rowid').bind(id).all()).results;
  assert.deepEqual(reviews.map(r=>r.action),['submitted','approved']);assert.ok(reviews.every(r=>r.revision===1&&r.actor_id===owner.id));
  assert.equal((await getWorkflow(db,id)).status,'published');assert.equal((await (event?getPublishedEvents:getPublishedAnnouncements)(db)).find(r=>r.id===id).title,'TEST ONLY saved title');await act(id,'archive');
 }
 });
 await t.test('combined schedule preserves live replacement and uses existing Cron cancellation/deduplication checks',async()=>{
 const id=await draft();await act(id,'approve-publish');await saveAnnouncementDraft(db,id,{title:'TEST ONLY scheduled replacement',summary:'Replacement',bodyText:'Replacement body',revision:'1'},mod.id);
 const now=Date.now();await act(id,'approve-schedule',owner,{dueAt:now+60000},now);assert.equal((await getPublishedAnnouncements(db)).find(r=>r.id===id).title,'TEST ONLY saved title');
 const reviews=(await db.prepare("SELECT revision FROM content_reviews WHERE content_id=? AND action='approved' ORDER BY revision").bind(id).all()).results;assert.deepEqual(reviews.map(r=>r.revision),[1,2]);
 const results=await Promise.all([sweepPublications(db,now+120000),sweepPublications(db,now+120000)]);assert.equal(results.reduce((n,r)=>n+r.published,0),1);assert.equal((await getPublishedAnnouncements(db,now+120000)).find(r=>r.id===id).title,'TEST ONLY scheduled replacement');await act(id,'archive',owner,{},now+120001);
 const cancelled=await draft(true);await act(cancelled,'approve-schedule',admin,{dueAt:now+60000},now);await act(cancelled,'cancel-schedule');assert.equal((await sweepPublications(db,now+120000)).published,0);await act(cancelled,'archive');
 });
 await t.test('combined failures and concurrent submissions cannot leave partial approvals, publications or audits',async()=>{
 const id=await draft(),before=await getWorkflow(db,id),auditCount=await count(id);
 await assert.rejects(act(id,'approve-publish',mod),e=>e.status===403);await assert.rejects(act(id,'approve-schedule',mod,{dueAt:Date.now()+60000}),e=>e.status===403);
 await db.prepare("CREATE TRIGGER fail_combined_release BEFORE INSERT ON content_releases BEGIN SELECT RAISE(ABORT,'TEST combined failure'); END").run();
 await assert.rejects(act(id,'approve-publish'),e=>e.status===409);assert.deepEqual(await getWorkflow(db,id),before);assert.equal(await count(id),auditCount);assert.equal((await db.prepare('SELECT count(*) n FROM content_reviews WHERE content_id=?').bind(id).first()).n,0);await db.prepare('DROP TRIGGER fail_combined_release').run();
 const race=await Promise.allSettled([changeWorkflow(db,id,'approve-publish',1,before.version,owner),changeWorkflow(db,id,'approve-publish',1,before.version,admin)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(await count(id),auditCount+3);assert.equal((await db.prepare('SELECT count(*) n FROM content_releases WHERE content_id=?').bind(id).first()).n,1);
 await assert.rejects(changeWorkflow(db,id,'approve-publish',1,before.version,owner),e=>e.status===409);await act(id,'archive');
 });
 await t.test('HTTP authorization, CSRF, duplicate fields and intent enforcement',async()=>{
 const id=await draft();const env={CONTENT_DB:db,CONTROL_ORIGIN:'https://workflow.test',DISCORD_CLIENT_ID:'100000000000000099',DISCORD_CLIENT_SECRET:'test-secret',AUTH_CSRF_SECRET:'test-csrf-secret-at-least-32-characters'};
 const users={};for(const a of [owner,admin,mod]){const raw=crypto.randomUUID().replaceAll('-','').repeat(2),hash=await hashToken(raw);await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES(?,?,?,1,1)').bind(a.id,a.name,a.name).run();await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(hash,a.id,Date.now(),Date.now()+3600000).run();users[a.role]={cookie:`__Host-cc_session=${raw}`,csrf:await staffCsrfToken({token_hash:hash},env)};}
 const post=(role,intent,extra={},headers={})=>{const u=users[role];return new Request('https://workflow.test/control/workflow/'+id,{method:'POST',headers:{Origin:'https://workflow.test',Cookie:u?.cookie||'','Content-Type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams({_csrf:u?.csrf||'',intent,revision:'1',version:'1',...extra})});};
 assert.equal((await workflowAction(post(null,'submit'),env,id)).status,403);assert.equal((await workflowAction(post('Moderator','submit',{}, {Origin:'https://evil.test'}),env,id)).status,403);assert.equal((await workflowAction(post('Moderator','submit',{_csrf:'bad'}),env,id)).status,403);
 assert.equal((await workflowAction(post('Moderator','submit'),env,id)).status,303);const w=await getWorkflow(db,id);assert.equal((await workflowAction(post('Moderator','approve',{version:String(w.version)}),env,id)).status,403);assert.equal((await workflowAction(post('Owner','approve',{version:String(w.version)}),env,id)).status,303);
 const approved=await getWorkflow(db,id);assert.equal((await workflowAction(post('Owner','schedule',{version:String(approved.version),date:'2026-03-08',time:'02:30'}),env,id)).status,400);assert.equal((await workflowAction(post('Owner','publish',{version:'1'}),env,id)).status,409);assert.equal((await workflowAction(post('Owner','made-up'),env,id)).status,400);
 assert.equal((await workflowAction(post('Moderator','approve-publish',{version:String(approved.version)}),env,id)).status,403);
 assert.equal((await workflowAction(post('Owner','approve-schedule',{version:String(approved.version),date:'2026-11-01',time:'01:30'}),env,id)).status,400);
 assert.equal((await workflowAction(post('Owner','approve-publish',{version:String(approved.version),returnTo:'https://evil.test'}),env,id)).status,400);
 const published=await workflowAction(post('Owner','approve-publish',{version:String(approved.version),returnTo:'editor'}),env,id);assert.equal(published.status,303);assert.equal(published.headers.get('Location'),`/control/news/${id}?updated=1`);
 });
});

test('Toronto publication times reject gaps, require explicit overlaps and enforce quarter hours',()=>{
 const baseline=Date.UTC(2026,0,1);
 assert.throws(()=>publicationInstant('2026-03-08','02:30','',baseline),/clocks jump/);
 assert.throws(()=>publicationInstant('2026-11-01','01:30','',baseline),/first or second/);
 assert.equal(publicationInstant('2026-11-01','01:30','later',baseline)-publicationInstant('2026-11-01','01:30','earlier',baseline),3600000);
 assert.throws(()=>publicationInstant('2026-11-01','01:31','earlier',baseline),/15-minute/);
 assert.throws(()=>publicationInstant('2026-02-30','12:00','',baseline),/valid calendar/);
 assert.throws(()=>publicationInstant('2026-01-01','12:00','',Date.UTC(2026,1,1)),/future/);
});

test('migration 0008 preserves legacy rows/history without fabricating approval; raw publication flags fail closed',async t=>{
 const proxy=await getPlatformProxy({configPath:'wrangler.jsonc',environment:'content_dev',persist:false,remoteBindings:false,envFiles:['tests/fixtures/empty-env.txt']});t.after(()=>proxy.dispose());const db=proxy.env.CONTENT_DB;
 for(const file of (await readdir('migrations')).filter(f=>f.endsWith('.sql')&&f<'0008').sort())await db.batch(splitSql(await readFile(`migrations/${file}`,'utf8')).map(sql=>db.prepare(sql)));
 const input={slug:'test-legacy-migration',title:'TEST ONLY legacy',bodyText:'TEST ONLY body',summary:'TEST ONLY summary',actorId:'test-legacy'};
 const id=await createAnnouncementDraft(db,input);await db.prepare("UPDATE content_items SET state='published',published_at=1 WHERE id=?").bind(id).run();
 const tables=['content_items','announcements','events','content_revisions','audit_records'],before={};for(const table of tables)before[table]=(await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;
 await db.batch(splitSql(await readFile('migrations/0008_content_publication_workflow.sql','utf8')).map(sql=>db.prepare(sql)));
 for(const table of tables)assert.deepEqual((await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results,before[table]);
 assert.equal((await db.prepare('SELECT count(*) n FROM content_reviews').first()).n,0);assert.equal((await db.prepare('SELECT count(*) n FROM content_releases').first()).n,0);assert.deepEqual(await getPublishedAnnouncements(db),[]);
});
