import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { announcementAction, announcementHistory, editorForm, getAnnouncementDraft, listAnnouncementDrafts, saveAnnouncementDraft, studioSession } from '../app/lib/announcement-studio.server.ts';
import { createAnnouncementDraft, createEventDraft, getPublishedAnnouncement, getPublishedAnnouncements, getPublishedEvents } from '../app/lib/content-db.server.ts';
import { hashToken, staffCsrfToken } from '../app/lib/staff-auth.server.ts';

const origin = 'https://studio.example.test';
const values = { title: 'TEST ONLY announcement', summary: 'TEST ONLY summary', bodyText: '## TEST ONLY\n\n**Safe draft**', revision: '0' };
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
const post = (path, fields, cookie = '', extra = {}) => new Request(origin + path, {
  method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Sec-Fetch-Site': 'same-origin', ...extra }, body: new URLSearchParams(fields),
});
async function staff(db, env, id, role) {
  const now = Date.now(), raw = crypto.randomUUID().replaceAll('-', '').repeat(2), token_hash = await hashToken(raw);
  await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id, 'test_staff', `TEST ONLY ${role ?? 'member'}`, now, now).run();
  if (role) await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES (?,?,?,?)').bind(id, role, now, now).run();
  await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(token_hash, id, now, now + 3600000).run();
  return { cookie: `__Host-cc_session=${raw}`, csrf: await staffCsrfToken({ token_hash }, env), token_hash };
}

test('migration 0007 preserves existing content, public DTOs and immutable history', async t => {
  const { db } = await setup(t, true);
  const input = { slug: 'test-existing', title: values.title, bodyText: values.bodyText, actorId: 'legacy-staff' };
  const announcement = await createAnnouncementDraft(db, input);
  await createEventDraft(db, { ...input, slug: 'test-event', startsAt: 1000, endsAt: 2000, timezone: 'UTC' });
  await db.prepare("UPDATE content_items SET state='published',published_at=1 WHERE id=?").bind(announcement).run();
  const tables = ['content_items', 'announcements', 'events', 'content_revisions', 'audit_records'];
  const before = {};
  for (const table of tables) before[table] = (await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;
  const published = await getPublishedAnnouncements(db);
  const migration = await readFile('migrations/0007_announcement_summaries.sql', 'utf8');
  await db.batch(splitSql(migration).map(sql => db.prepare(sql)));
  for (const table of tables) {
    const after = (await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;
    if (table === 'announcements') for (const row of after) { assert.equal(row.summary, ''); delete row.summary; }
    assert.deepEqual(after, before[table], table);
  }
  assert.deepEqual(await getPublishedAnnouncements(db), published);
  for (const table of ['content_revisions', 'audit_records']) await assert.rejects(db.prepare(`DELETE FROM ${table}`).run());
});

test('draft lifecycle, literal search, snapshots, protected states and concurrent edits on local D1', async t => {
  const { db } = await setup(t);
  const id = await saveAnnouncementDraft(db, null, values, 'test-author');
  let row = await getAnnouncementDraft(db, id);
  assert.equal(row.summary, values.summary); assert.equal(row.revision, 1); assert.equal(row.author, null);
  assert.equal((await listAnnouncementDrafts(db, 'ONLY summary', 0))[0].id, id);
  assert.equal((await listAnnouncementDrafts(db, '%', 0)).length, 0);
  assert.equal((await listAnnouncementDrafts(db, "' OR 1=1 --", 0)).length, 0);
  await assert.rejects(listAnnouncementDrafts(db, 'x'.repeat(161), 0), rejected(400));
  await assert.rejects(listAnnouncementDrafts(db, '', -1), rejected(400));
  const firstSnapshot = await db.prepare('SELECT snapshot_json FROM content_revisions WHERE content_id=? AND revision=1').bind(id).first();
  const edited = { ...values, title: 'TEST ONLY edited', summary: 'New summary', bodyText: 'New body', revision: '1' };
  await saveAnnouncementDraft(db, id, edited, 'test-editor');
  row = await getAnnouncementDraft(db, id);
  assert.equal(row.revision, 2); assert.equal(row.body_text, edited.bodyText);
  assert.equal((await db.prepare('SELECT snapshot_json FROM content_revisions WHERE content_id=? AND revision=1').bind(id).first()).snapshot_json, firstSnapshot.snapshot_json);
  const snapshot = JSON.parse((await db.prepare('SELECT snapshot_json FROM content_revisions WHERE content_id=? AND revision=2').bind(id).first()).snapshot_json);
  assert.equal(snapshot.summary, edited.summary); assert.equal(snapshot.body_text, edited.bodyText);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 2);
  assert.deepEqual((await announcementHistory(db, id)).map(r => r.revision), [2, 1]);
  await assert.rejects(saveAnnouncementDraft(db, id, edited, 'test-loser'), rejected(409));
  const competing = { ...edited, revision: '2' };
  // Force both reads to finish before either transaction starts, exercising the SQL race guard.
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  let arrivals = 0;
  const racingDb = { prepare: sql => db.prepare(sql), batch: async statements => {
    if (++arrivals === 2) release();
    await ready;
    return db.batch(statements);
  } };
  const races = await Promise.allSettled([
    saveAnnouncementDraft(racingDb, id, { ...competing, title: 'TEST ONLY winner A' }, 'test-a'),
    saveAnnouncementDraft(racingDb, id, { ...competing, title: 'TEST ONLY winner B' }, 'test-b'),
  ]);
  assert.equal(races.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(races.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
  assert.equal((await getAnnouncementDraft(db, id)).revision, 3);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 3);
  assert.equal(await getPublishedAnnouncement(db, id), null);
  assert.deepEqual(await getPublishedAnnouncements(db), []);
  assert.deepEqual(await getPublishedEvents(db), []);
  const stable = await getAnnouncementDraft(db, id);
  await db.prepare("CREATE TRIGGER fail_studio_revision BEFORE INSERT ON content_revisions WHEN NEW.actor_id='test-fail' BEGIN SELECT RAISE(ABORT,'test rollback'); END").run();
  await assert.rejects(saveAnnouncementDraft(db, id, { ...edited, revision: '3' }, 'test-fail'), rejected(409));
  assert.deepEqual(await getAnnouncementDraft(db, id), stable);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 3);
  for (const state of ['review', 'scheduled', 'published', 'archived']) {
    const other = await saveAnnouncementDraft(db, null, values, 'test-author');
    await db.prepare('UPDATE content_items SET state=?,published_at=1 WHERE id=?').bind(state, other).run();
    await assert.rejects(getAnnouncementDraft(db, other), rejected(404));
    await assert.rejects(saveAnnouncementDraft(db, other, { ...edited, revision: '1' }, 'test-editor'), rejected(404));
  }
  const event = await createEventDraft(db, { slug: 'test-editor-event', title: values.title, bodyText: values.bodyText, actorId: 'test-author', startsAt: 1, endsAt: 2, timezone: 'UTC' });
  await assert.rejects(saveAnnouncementDraft(db, event, edited, 'test-editor'), rejected(404));
  assert.deepEqual((await listAnnouncementDrafts(db, '', 0)).map(r => r.id), [id]);
});

test('every editor mutation enforces staff role, Origin and CSRF, preserving invalid and conflicting submissions', async t => {
  const { db, env } = await setup(t);
  const credentials = {};
  for (const [index, role] of ['Moderator', 'Administrator', 'Owner', null].entries()) credentials[role ?? 'member'] = await staff(db, env, `10000000000000000${index + 1}`, role);
  for (const cookie of ['', credentials.member.cookie]) {
    await assert.rejects(studioSession(new Request(origin + '/control/news', { headers: { Cookie: cookie } }), env), error => error.code === 'denied');
    await assert.rejects(announcementAction(post('/control/news/new', { ...values, intent: 'save', _csrf: credentials.member.csrf }, cookie), env, null, false), rejected(403));
  }
  const moderator = credentials.Moderator;
  for (const extra of [{ Origin: 'null' }, { Origin: 'https://evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    await assert.rejects(announcementAction(post('/control/news/new', { ...values, intent: 'save', _csrf: moderator.csrf }, moderator.cookie, extra), env, null, false), rejected(403));
  }
  const missingOrigin = post('/control/news/new', { ...values, intent: 'save', _csrf: moderator.csrf }, moderator.cookie);
  missingOrigin.headers.delete('Origin');
  await assert.rejects(announcementAction(missingOrigin, env, null, false), rejected(403));
  for (const csrf of ['', 'bad', credentials.Owner.csrf]) await assert.rejects(announcementAction(post('/control/news/new', { ...values, intent: 'save', _csrf: csrf }, moderator.cookie), env, null, false), rejected(403));
  await assert.rejects(announcementAction(new Request(origin + '/control/news/new', { headers: { Cookie: moderator.cookie } }), env, null, false), rejected(405));
  const invalid = { ...values, title: ' ', summary: 's'.repeat(601), bodyText: '<script>preserve me</script>' };
  const validation = await announcementAction(post('/control/news/new', { ...invalid, intent: 'save', _csrf: moderator.csrf }, moderator.cookie), env, null, false);
  assert.equal(validation.init.status, 400); assert.deepEqual(validation.data.values, invalid);
  assert.ok(validation.data.errors.title); assert.ok(validation.data.errors.summary);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM content_items').first()).n, 0);
  for (const field of ['title', 'summary', 'bodyText']) {
    const empty = await announcementAction(post('/control/news/new', { ...values, [field]: '', intent: 'save', _csrf: moderator.csrf }, moderator.cookie), env, null, false);
    assert.equal(empty.init.status, 400); assert.ok(empty.data.errors[field]);
  }
  const duplicate = new URLSearchParams({ ...values, intent: 'save' }); duplicate.append('title', 'duplicate');
  const parsed = await editorForm(new Request(origin, { method: 'POST', body: duplicate }));
  assert.ok(parsed.errors.title);
  assert.ok((await editorForm(post('/', { ...values, intent: 'publish' }))).errors.form);
  const unsupported = await announcementAction(post('/control/news/new', { ...values, intent: 'publish', _csrf: moderator.csrf }, moderator.cookie), env, null, false);
  assert.equal(unsupported.init.status, 400); assert.deepEqual(unsupported.data.values, values);
  const oversizedBody = { ...values, bodyText: 'x'.repeat(40001) };
  const bodyFailure = await announcementAction(post('/control/news/new', { ...oversizedBody, intent: 'save', _csrf: moderator.csrf }, moderator.cookie), env, null, false);
  assert.equal(bodyFailure.init.status, 400); assert.deepEqual(bodyFailure.data.values, oversizedBody);
  const ids = [];
  for (const role of ['Moderator', 'Administrator', 'Owner']) {
    const credential = credentials[role];
    const result = await announcementAction(post('/control/news/new', { ...values, intent: 'save', _csrf: credential.csrf }, credential.cookie), env, null, false);
    assert.equal(result.status, 303); ids.push(result.headers.get('Location').split('/').at(-1).split('?')[0]);
  }
  const id = ids[0];
  assert.equal((await getAnnouncementDraft(db, id)).author, 'TEST ONLY Moderator');
  const saved = { ...values, title: 'TEST ONLY first save', revision: '1' };
  await announcementAction(post(`/control/news/${id}`, { ...saved, intent: 'save', _csrf: moderator.csrf }, moderator.cookie), env, id, false);
  const stale = { ...values, title: 'TEST ONLY unsaved work', bodyText: 'Keep this exact text\n\n<script>not executable</script>', revision: '1' };
  const conflict = await announcementAction(post(`/control/news/${id}`, { ...stale, intent: 'save', _csrf: moderator.csrf }, moderator.cookie), env, id, false);
  assert.equal(conflict.init.status, 409); assert.deepEqual(conflict.data.values, stale);
  assert.equal((await getAnnouncementDraft(db, id)).title, saved.title);
  await db.prepare('UPDATE site_sessions SET revoked_at=? WHERE token_hash=?').bind(Date.now(), moderator.token_hash).run();
  await assert.rejects(announcementAction(post(`/control/news/${id}`, { ...values, revision: '2', intent: 'save', _csrf: moderator.csrf }, moderator.cookie), env, id, false), rejected(403));
});
