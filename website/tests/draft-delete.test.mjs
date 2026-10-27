import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { getEventDraft, listEventDrafts, saveEventDraft, eventEditorValues } from '../app/lib/event-studio.server.ts';
import { getAnnouncementDraft, listAnnouncementDrafts, saveAnnouncementDraft } from '../app/lib/announcement-studio.server.ts';
import { archiveDraft, deleteDraftAction } from '../app/lib/draft-delete.server.ts';
import { draftHistory } from '../app/lib/content-studio.server.ts';
import { createAnnouncementDraft, createEventDraft, getPublishedAnnouncement, getPublishedAnnouncements, getPublishedEvents } from '../app/lib/content-db.server.ts';
import { hashToken, staffCsrfToken } from '../app/lib/staff-auth.server.ts';

const origin = 'https://studio.example.test';
const values = { title: 'TEST ONLY event', bodyText: '## TEST ONLY\n\n**Safe draft**', startLocal: '2026-11-01T01:30', endLocal: '2026-11-01T02:30', timezone: 'America/Toronto', startOccurrence: 'later', endOccurrence: '', revision: '0' };
async function setup(t, beforeSeven = false) {
  const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', environment: 'content_dev', persist: false, remoteBindings: false, envFiles: ['tests/fixtures/empty-env.txt'] });
  t.after(() => proxy.dispose());
  const db = proxy.env.CONTENT_DB;
  const files = (await readdir('migrations')).filter(name => name.endsWith('.sql') && (!beforeSeven || name < '0007')).sort();
  for (const file of files) await db.batch(splitSql(await readFile(`migrations/${file}`, 'utf8')).map(sql => db.prepare(sql)));
  const env = { CONTENT_DB: db, CONTROL_ORIGIN: origin, DISCORD_CLIENT_ID: '100000000000000099', DISCORD_CLIENT_SECRET: 'fictional-client-secret', AUTH_CSRF_SECRET: 'fictional-csrf-secret-at-least-32-characters' };
  return { db, env };
}
const rejected = status => error => error.status === status;
const post = (fields, cookie = '', extra = {}) => new Request(origin + '/control/drafts/test/delete', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', ...extra }, body: new URLSearchParams(fields) });
async function staff(db, env, id, role) {
  const now = Date.now(), raw = crypto.randomUUID().replaceAll('-', '').repeat(2), token_hash = await hashToken(raw);
  await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id, 'test_staff', `TEST ONLY ${role ?? 'member'}`, now, now).run();
  if (role) await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES (?,?,?,?)').bind(id, role, now, now).run();
  await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(token_hash, id, now, now + 3600000).run();
  return { cookie: `__Host-cc_session=${raw}`, csrf: await staffCsrfToken({ token_hash }, env), token_hash };
}

async function makeDraft(db, kind) {
  const input = { slug: `test-delete-${crypto.randomUUID()}`, title: 'TEST ONLY draft title', bodyText: 'TEST ONLY saved body', actorId: 'test-author', summary: 'TEST ONLY summary' };
  return kind === 'announcement' ? createAnnouncementDraft(db, input) : createEventDraft(db, { ...input, startsAt: 1000, endsAt: 2000, timezone: 'America/Toronto' });
}

test('deletion archives both draft types and appends history/audit without removing saved content', async t => {
  const { db } = await setup(t);
  for (const kind of ['announcement', 'event']) {
    const id = await makeDraft(db, kind);
    const original = await db.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first();
    const history = await db.prepare('SELECT * FROM content_revisions WHERE content_id=?').bind(id).first();
    const detailsTable = kind === 'announcement' ? 'announcements' : 'events';
    const details = await db.prepare(`SELECT * FROM ${detailsTable} WHERE content_id=?`).bind(id).first();
    await archiveDraft(db, id, kind, 1, 'test-deleter');
    const archived = await db.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first();
    assert.equal(archived.state, 'archived'); assert.equal(archived.published_at, null);
    for (const field of ['id', 'kind', 'slug', 'title', 'body_text', 'created_at', 'is_fixture']) assert.equal(archived[field], original[field]);
    assert.deepEqual(await db.prepare(`SELECT * FROM ${detailsTable} WHERE content_id=?`).bind(id).first(), details);
    assert.deepEqual(await db.prepare('SELECT * FROM content_revisions WHERE content_id=? AND revision=1').bind(id).first(), history);
    const snapshot = JSON.parse((await db.prepare('SELECT snapshot_json FROM content_revisions WHERE content_id=? AND revision=2').bind(id).first()).snapshot_json);
    assert.equal(snapshot.state, 'archived'); assert.equal(snapshot.title, original.title); assert.equal(snapshot.body_text, original.body_text);
    assert.equal(kind === 'event' ? snapshot.starts_at : snapshot.summary, kind === 'event' ? details.starts_at : details.summary);
    const audit = (await db.prepare('SELECT * FROM audit_records WHERE content_id=? ORDER BY rowid DESC LIMIT 1').bind(id).first());
    assert.equal(audit.action, 'state_changed'); assert.equal(audit.actor_id, 'test-deleter');
    assert.deepEqual(JSON.parse(audit.details_json), { reason: 'draft_deleted', from: 'draft', to: 'archived', revision: 2 });
    assert.deepEqual((await draftHistory(db, id)).map(row => row.revision), [2, 1]);
    await assert.rejects(kind === 'event' ? getEventDraft(db, id) : getAnnouncementDraft(db, id), rejected(404));
    await assert.rejects(archiveDraft(db, id, kind, 1, 'test-repeat'), rejected(409));
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 2);
  }
  assert.deepEqual(await listEventDrafts(db, '', 0), []); assert.deepEqual(await listAnnouncementDrafts(db, '', 0), []);
  assert.deepEqual(await getPublishedEvents(db), []); assert.deepEqual(await getPublishedAnnouncements(db), []);
});

test('protected states, previously published drafts, fixtures, wrong kinds and stale revisions cannot be deleted', async t => {
  const { db } = await setup(t);
  for (const kind of ['announcement', 'event']) for (const state of ['published', 'scheduled', 'review', 'archived', 'fixture', 'previously-published', 'stale', 'wrong-kind']) {
    const id = await makeDraft(db, kind);
    if (['published', 'scheduled', 'review', 'archived'].includes(state)) await db.prepare('UPDATE content_items SET state=?,published_at=1 WHERE id=?').bind(state, id).run();
    if (state === 'fixture') await db.prepare('UPDATE content_items SET is_fixture=1 WHERE id=?').bind(id).run();
    if (state === 'previously-published') await db.prepare('UPDATE content_items SET published_at=1 WHERE id=?').bind(id).run();
    const before = await db.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first();
    await assert.rejects(archiveDraft(db, id, state === 'wrong-kind' ? kind === 'event' ? 'announcement' : 'event' : kind, state === 'stale' ? 2 : 1, 'test-deleter'), rejected(409));
    assert.deepEqual(await db.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first(), before);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM content_revisions WHERE content_id=?').bind(id).first()).n, 1);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 1);
  }
});

test('simultaneous deletion, a state-change race and failed history inserts cannot partially delete', async t => {
  const { db } = await setup(t);
  for (const kind of ['announcement', 'event']) {
    const id = await makeDraft(db, kind);
    let release; const ready = new Promise(resolve => { release = resolve; }); let arrivals = 0;
    const racing = { prepare: sql => db.prepare(sql), batch: async statements => { if (++arrivals === 2) release(); await ready; return db.batch(statements); } };
    const result = await Promise.allSettled([archiveDraft(racing, id, kind, 1, 'test-a'), archiveDraft(racing, id, kind, 1, 'test-b')]);
    assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(result.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM content_revisions WHERE content_id=?').bind(id).first()).n, 2);
    const protectedId = await makeDraft(db, kind);
    const stateRace = { prepare: sql => db.prepare(sql), batch: async statements => {
      await db.prepare("UPDATE content_items SET state='published',published_at=1 WHERE id=?").bind(protectedId).run(); return db.batch(statements);
    } };
    await assert.rejects(archiveDraft(stateRace, protectedId, kind, 1, 'test-race'), rejected(409));
    assert.equal((await db.prepare('SELECT state FROM content_items WHERE id=?').bind(protectedId).first()).state, 'published');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(protectedId).first()).n, 1);
    const failingId = await makeDraft(db, kind);
    await db.prepare("CREATE TRIGGER fail_delete_revision BEFORE INSERT ON content_revisions WHEN NEW.actor_id='test-fail' BEGIN SELECT RAISE(ABORT,'test rollback'); END").run();
    await assert.rejects(archiveDraft(db, failingId, kind, 1, 'test-fail'), rejected(409));
    assert.equal((await db.prepare('SELECT state FROM content_items WHERE id=?').bind(failingId).first()).state, 'draft');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(failingId).first()).n, 1);
    await db.prepare('DROP TRIGGER fail_delete_revision').run();
  }
});

test('delete actions require confirmation intent, staff roles, Origin and session CSRF; redirect with success', async t => {
  const { db, env } = await setup(t); const credentials = {};
  for (const [i, role] of ['Moderator', 'Administrator', 'Owner', null].entries()) credentials[role ?? 'member'] = await staff(db, env, `10000000000000000${i + 1}`, role);
  const mod = credentials.Moderator;
  const id = await makeDraft(db, 'announcement');
  const fields = { kind: 'announcement', revision: '1', intent: 'delete', _csrf: mod.csrf };
  for (const cookie of ['', credentials.member.cookie]) assert.equal((await deleteDraftAction(post(fields, cookie), env, id, false)).status, 403);
  for (const extra of [{ Origin: 'null' }, { Origin: 'https://evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) assert.equal((await deleteDraftAction(post(fields, mod.cookie, extra), env, id, false)).status, 403);
  const noOrigin = post(fields, mod.cookie); noOrigin.headers.delete('Origin');
  assert.equal((await deleteDraftAction(noOrigin, env, id, false)).status, 403);
  for (const csrf of ['', 'bad', credentials.Owner.csrf]) assert.equal((await deleteDraftAction(post({ ...fields, _csrf: csrf }, mod.cookie), env, id, false)).status, 403);
  assert.equal((await deleteDraftAction(new Request(origin), env, id, false)).status, 405);
  for (const invalid of [{ intent: 'cancel' }, { intent: '' }, { revision: '0' }, { revision: '9007199254740992' }, { kind: 'other' }]) assert.equal((await deleteDraftAction(post({ ...fields, ...invalid }, mod.cookie), env, id, false)).status, 400);
  const duplicate = new URLSearchParams(fields); duplicate.append('revision', '1');
  assert.equal((await deleteDraftAction(new Request(origin, { method: 'POST', headers: { Origin: origin, Cookie: mod.cookie }, body: duplicate }), env, id, false)).status, 400);
  assert.equal((await db.prepare('SELECT state FROM content_items WHERE id=?').bind(id).first()).state, 'draft');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 1);
  for (const role of ['Moderator', 'Administrator', 'Owner']) for (const kind of ['announcement', 'event']) {
    const draftId = await makeDraft(db, kind), cred = credentials[role];
    const response = await deleteDraftAction(post({ kind, revision: '1', intent: 'delete', _csrf: cred.csrf }, cred.cookie), env, draftId, false);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), kind === 'event' ? '/control/news?kind=event&deleted=1' : '/control/news?deleted=1');
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('saving and deleting the same revision allows exactly one atomic winner', async t => {
  const { db } = await setup(t);
  for (const kind of ['announcement', 'event']) {
    const id = await makeDraft(db, kind);
    let release; const ready = new Promise(resolve => { release = resolve; }); let arrivals = 0;
    const racing = { prepare: sql => db.prepare(sql), batch: async statements => { if (++arrivals === 2) release(); await ready; return db.batch(statements); } };
    const inputs = kind === 'event' ? eventEditorValues(await getEventDraft(db, id)) : { title: 'TEST ONLY draft title', summary: 'TEST ONLY summary', bodyText: 'TEST ONLY saved body', revision: '1' };
    const save = kind === 'event' ? saveEventDraft : saveAnnouncementDraft;
    const results = await Promise.allSettled([save(racing, id, { ...inputs, title: 'TEST ONLY edited title' }, 'test-editor'), archiveDraft(racing, id, kind, 1, 'test-deleter')]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
    const row = await db.prepare('SELECT state,title FROM content_items WHERE id=?').bind(id).first();
    assert.equal(row.title, row.state === 'archived' ? 'TEST ONLY draft title' : 'TEST ONLY edited title');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM content_revisions WHERE content_id=?').bind(id).first()).n, 2);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 2);
  }
});

