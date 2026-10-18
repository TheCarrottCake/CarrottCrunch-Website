import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { eventAction, eventForm, eventEditorValues, getEventDraft, listEventDrafts, saveEventDraft } from '../app/lib/event-studio.server.ts';
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
const post = (path, fields, cookie = '', extra = {}) => new Request(origin + path, {
  method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Sec-Fetch-Site': 'same-origin', ...extra }, body: new URLSearchParams({ ...fields, eventDate: fields.startLocal?.split('T')[0] || '', startTime: fields.startLocal?.split('T')[1]?.slice(0,5) || '', endTime: fields.endLocal?.split('T')[1]?.slice(0,5) || '', endDate: fields.endLocal?.split('T')[0] !== fields.startLocal?.split('T')[0] ? fields.endLocal?.split('T')[0] || '' : '', ...(fields.endLocal?.split('T')[0] !== fields.startLocal?.split('T')[0] ? { differentEndDate: '1' } : {}) }),
});
async function staff(db, env, id, role) {
  const now = Date.now(), raw = crypto.randomUUID().replaceAll('-', '').repeat(2), token_hash = await hashToken(raw);
  await db.prepare('INSERT INTO site_users(discord_user_id,username,display_name,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id, 'test_staff', `TEST ONLY ${role ?? 'member'}`, now, now).run();
  if (role) await db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES (?,?,?,?)').bind(id, role, now, now).run();
  await db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(token_hash, id, now, now + 3600000).run();
  return { cookie: `__Host-cc_session=${raw}`, csrf: await staffCsrfToken({ token_hash }, env), token_hash };
}

test('event drafts round-trip exact times, search literally and append immutable history/audits', async t => {
  const { db } = await setup(t);
  const id = await saveEventDraft(db, null, values, 'test-author');
  const original = await getEventDraft(db, id);
  assert.equal(original.starts_at, Date.parse('2026-11-01T06:30:00.000Z'));
  assert.equal(original.ends_at, Date.parse('2026-11-01T07:30:00.000Z'));
  assert.deepEqual(eventEditorValues(original), { ...values, revision: '1' });
  assert.equal((await listEventDrafts(db, 'Safe draft', 0))[0].id, id);
  for (const q of ['%', '_', "' OR 1=1 --"]) assert.equal((await listEventDrafts(db, q, 0)).length, 0);
  await assert.rejects(listEventDrafts(db, 'x'.repeat(161), 0), rejected(400));
  await assert.rejects(listEventDrafts(db, '', -1), rejected(400));
  const first = await db.prepare('SELECT * FROM content_revisions WHERE content_id=? AND revision=1').bind(id).first();
  const edited = { ...values, title: 'TEST ONLY edited', bodyText: 'Changed description', revision: '1' };
  await saveEventDraft(db, id, edited, 'test-editor');
  const reopened = await getEventDraft(db, id);
  assert.equal(reopened.starts_at, original.starts_at); assert.equal(reopened.ends_at, original.ends_at);
  assert.deepEqual(eventEditorValues(reopened), { ...edited, revision: '2' });
  assert.deepEqual(await db.prepare('SELECT * FROM content_revisions WHERE content_id=? AND revision=1').bind(id).first(), first);
  const snapshot = JSON.parse((await db.prepare('SELECT snapshot_json FROM content_revisions WHERE content_id=? AND revision=2').bind(id).first()).snapshot_json);
  assert.equal(snapshot.starts_at, original.starts_at); assert.equal(snapshot.ends_at, original.ends_at);
  assert.equal(snapshot.timezone, values.timezone); assert.equal(snapshot.body_text, edited.bodyText);
  assert.equal(snapshot.state, 'draft'); assert.equal(snapshot.published_at, null);
  assert.deepEqual((await draftHistory(db, id)).map(row => row.revision), [2, 1]);
  const audits = (await db.prepare('SELECT * FROM audit_records WHERE content_id=? ORDER BY rowid').bind(id).all()).results;
  assert.deepEqual(audits.map(row => [row.action, row.actor_id]), [['created', 'test-author'], ['updated', 'test-editor']]);
  assert.equal(JSON.parse(audits[1].details_json).revision, 2);
  for (const table of ['content_revisions', 'audit_records']) {
    await assert.rejects(db.prepare(`DELETE FROM ${table} WHERE content_id=?`).bind(id).run());
    await assert.rejects(db.prepare(`UPDATE ${table} SET actor_id='changed' WHERE content_id=?`).bind(id).run());
  }
  assert.equal(await getPublishedAnnouncement(db, id), null);
  assert.deepEqual(await getPublishedAnnouncements(db), []); assert.deepEqual(await getPublishedEvents(db), []);
});

test('legacy exact instants survive Toronto reopening and edits; new off-grid times are rejected', async t => {
  const { db } = await setup(t);
  const startsAt = Date.parse('2026-11-01T06:17:42.123Z'), endsAt = Date.parse('2026-11-02T07:32:12.456Z');
  const id = await createEventDraft(db, { slug: 'test-legacy-precision', title: values.title, bodyText: values.bodyText, actorId: 'test-author', startsAt, endsAt, timezone: 'UTC' });
  const inputs = eventEditorValues(await getEventDraft(db, id));
  assert.equal(inputs.timezone, 'America/Toronto'); assert.equal(inputs.startOccurrence, 'later');
  await saveEventDraft(db, id, { ...inputs, title: 'TEST ONLY body edit' }, 'test-editor');
  const saved = await getEventDraft(db, id);
  assert.equal(saved.starts_at, startsAt); assert.equal(saved.ends_at, endsAt); assert.equal(saved.timezone, 'America/Toronto');
  await assert.rejects(saveEventDraft(db, null, { ...values, startLocal: '2026-11-01T01:17' }, 'test-author'), rejected(400));
  await assert.rejects(saveEventDraft(db, id, { ...inputs, revision: '2', endLocal: '2026-11-02T02:33:12.456' }, 'test-editor'), rejected(400));
});

test('visible date/time controls are validated independently of hidden original values', async t => {
  const { db, env } = await setup(t); const mod = await staff(db, env, '100000000000000001', 'Moderator');
  const raw = fields => new Request(origin, { method: 'POST', headers: { Origin: origin, Cookie: mod.cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...values, intent: 'save', _csrf: mod.csrf, eventDate: '2026-11-01', startTime: '01:30', endTime: '02:30', endDate: '', ...fields }) });
  const offGrid = await eventAction(raw({ startTime: '01:17' }), env, null, false);
  assert.equal(offGrid.init.status, 400); assert.equal(offGrid.data.values.startLocal, '2026-11-01T01:17');
  for (const fields of [{ eventDate: '2026-02-30' }, { endTime: '24:00' }, { startTime: '01:30:15' }, { differentEndDate: '1', endDate: '' }, { timezone: 'UTC' }]) {
    assert.equal((await eventAction(raw(fields), env, null, false)).init.status, 400);
  }
  const changed = await eventForm(raw({ startTime: '01:45' }));
  assert.equal(changed.values.startLocal, '2026-11-01T01:45');
  const overnight = await eventAction(raw({ differentEndDate: '1', endDate: '2026-11-02' }), env, null, false);
  assert.equal(overnight.status, 303);
  const saved = await getEventDraft(db, overnight.headers.get('Location').split('/').at(-1).split('?')[0]);
  assert.equal(saved.ends_at, Date.parse('2026-11-02T07:30:00Z'));
});

test('event transactions roll back races, state changes and failed revision writes', async t => {
  const { db } = await setup(t);
  const id = await saveEventDraft(db, null, values, 'test-author');
  let release; const ready = new Promise(resolve => { release = resolve; }); let arrivals = 0;
  const racingDb = { prepare: sql => db.prepare(sql), batch: async statements => { if (++arrivals === 2) release(); await ready; return db.batch(statements); } };
  const races = await Promise.allSettled([
    saveEventDraft(racingDb, id, { ...values, revision: '1', title: 'TEST ONLY A', startOccurrence: 'earlier' }, 'test-a'),
    saveEventDraft(racingDb, id, { ...values, revision: '1', title: 'TEST ONLY B' }, 'test-b'),
  ]);
  assert.equal(races.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(races.filter(r => r.status === 'rejected' && r.reason.status === 409).length, 1);
  const stable = await getEventDraft(db, id); assert.equal(stable.revision, 2);
  await db.prepare("CREATE TRIGGER fail_event_revision BEFORE INSERT ON content_revisions WHEN NEW.actor_id='test-fail' BEGIN SELECT RAISE(ABORT,'test rollback'); END").run();
  await assert.rejects(saveEventDraft(db, id, { ...values, revision: '2', title: 'Do not persist', endLocal: '2026-11-02T12:00' }, 'test-fail'), rejected(409));
  assert.deepEqual(await getEventDraft(db, id), stable);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(id).first()).n, 2);
  const stateRace = { prepare: sql => db.prepare(sql), batch: async statements => {
    await db.prepare("UPDATE content_items SET state='published',published_at=1 WHERE id=?").bind(id).run(); return db.batch(statements);
  } };
  await assert.rejects(saveEventDraft(stateRace, id, { ...values, revision: '2', title: 'Do not overwrite published' }, 'test-race'), rejected(409));
  assert.equal((await db.prepare('SELECT title FROM content_items WHERE id=?').bind(id).first()).title, stable.title);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM content_revisions WHERE content_id=?').bind(id).first()).n, 2);
});

test('event editor excludes protected states, fixtures and announcements; paginates drafts', async t => {
  const { db } = await setup(t);
  const announcement = await createAnnouncementDraft(db, { slug: 'test-announcement', title: 'TEST ONLY', bodyText: 'TEST ONLY', actorId: 'test-author' });
  await assert.rejects(getEventDraft(db, announcement), rejected(404));
  for (const state of ['review', 'scheduled', 'published', 'archived', 'fixture']) {
    const id = await saveEventDraft(db, null, values, 'test-author');
    if (state === 'fixture') await db.prepare('UPDATE content_items SET is_fixture=1 WHERE id=?').bind(id).run();
    else await db.prepare('UPDATE content_items SET state=?,published_at=1 WHERE id=?').bind(state, id).run();
    const before = await db.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first();
    await assert.rejects(saveEventDraft(db, id, { ...values, revision: '1' }, 'test-editor'), rejected(404));
    assert.deepEqual(await db.prepare('SELECT * FROM content_items WHERE id=?').bind(id).first(), before);
  }
  assert.deepEqual(await listEventDrafts(db, '', 0), []);
  for (let i = 0; i < 26; i++) await saveEventDraft(db, null, { ...values, title: `TEST ONLY page ${i}` }, 'test-author');
  assert.equal((await listEventDrafts(db, '', 0)).length, 25); assert.equal((await listEventDrafts(db, '', 24)).length, 2);
});

test('event actions enforce roles, same-origin CSRF and preserve every invalid/conflicting field', async t => {
  const { db, env } = await setup(t); const credentials = {};
  for (const [i, role] of ['Moderator', 'Administrator', 'Owner', null].entries()) credentials[role ?? 'member'] = await staff(db, env, `10000000000000000${i + 1}`, role);
  const mod = credentials.Moderator, fields = { ...values, intent: 'save', _csrf: mod.csrf };
  for (const cookie of ['', credentials.member.cookie]) await assert.rejects(eventAction(post('/', fields, cookie), env, null, false), rejected(403));
  for (const extra of [{ Origin: 'null' }, { Origin: 'https://evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) await assert.rejects(eventAction(post('/', fields, mod.cookie, extra), env, null, false), rejected(403));
  const missingOrigin = post('/', fields, mod.cookie); missingOrigin.headers.delete('Origin');
  await assert.rejects(eventAction(missingOrigin, env, null, false), rejected(403));
  for (const csrf of ['', 'bad', credentials.Owner.csrf]) await assert.rejects(eventAction(post('/', { ...fields, _csrf: csrf }, mod.cookie), env, null, false), rejected(403));
  await assert.rejects(eventAction(new Request(origin, { headers: { Cookie: mod.cookie } }), env, null, false), rejected(405));
  for (const invalid of [{ ...values, title: '' }, { ...values, bodyText: 'x'.repeat(40001) }, { ...values, startOccurrence: '' }, { ...values, startLocal: '2026-03-08T02:30', startOccurrence: '' }, { ...values, endLocal: '2026-11-01T00:30' }, { ...values, timezone: 'Not/AZone' }]) {
    const result = await eventAction(post('/', { ...invalid, intent: 'save', _csrf: mod.csrf }, mod.cookie), env, null, false);
    assert.equal(result.init.status, 400); assert.deepEqual(result.data.values, { ...invalid, timezone: 'America/Toronto' });
  }
  assert.equal((await db.prepare('SELECT count(*) AS n FROM content_items').first()).n, 0);
  const duplicate = new URLSearchParams(fields); duplicate.append('startLocal', 'duplicate');
  assert.ok((await eventForm(new Request(origin, { method: 'POST', body: duplicate }))).errors.startLocal);
  for (const intent of ['publish', 'schedule', 'cancel', 'delete']) assert.ok((await eventForm(post('/', { ...fields, intent }))).errors.form);
  await assert.rejects(eventForm(new Request(origin, { method: 'POST', body: 'x'.repeat(262145), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })), rejected(413));
  await assert.rejects(eventForm(new Request(origin, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })), rejected(400));
  const ids = [];
  for (const role of ['Moderator', 'Administrator', 'Owner']) {
    const cred = credentials[role]; const result = await eventAction(post('/', { ...fields, _csrf: cred.csrf }, cred.cookie), env, null, false);
    assert.equal(result.status, 303); ids.push(result.headers.get('Location').split('/').at(-1).split('?')[0]);
  }
  const id = ids[0]; assert.equal((await getEventDraft(db, id)).author, 'TEST ONLY Moderator');
  await eventAction(post('/', { ...fields, revision: '1', title: 'TEST ONLY saved' }, mod.cookie), env, id, false);
  const stale = { ...values, revision: '1', title: 'TEST ONLY unsaved', bodyText: '<script>keep exact text</script>\n\n', startOccurrence: 'earlier' };
  const conflict = await eventAction(post('/', { ...stale, intent: 'save', _csrf: mod.csrf }, mod.cookie), env, id, false);
  assert.equal(conflict.init.status, 409); assert.deepEqual(conflict.data.values, stale);
  assert.equal((await getEventDraft(db, id)).title, 'TEST ONLY saved');
  await db.prepare("UPDATE staff_accounts SET role='Administrator' WHERE discord_user_id='100000000000000001'").run();
  await assert.rejects(eventAction(post('/', fields, mod.cookie), env, null, false), rejected(403));
  assert.deepEqual(await getPublishedEvents(db), []);
});

