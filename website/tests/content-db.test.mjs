import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import {
  createAnnouncementDraft, createEventDraft, getPublishedAnnouncements,
  getPublishedEvents, requireContentDatabase,
} from '../app/lib/content-db.server.ts';

const draft = { slug: 'test-announcement', title: 'TEST ONLY', bodyText: 'Not community content', actorId: 'test-actor' };

test('D1 migrations, operations, publication filtering, and fixtures', async t => {
  const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', environment: 'content_dev', persist: false, remoteBindings: false, envFiles: ['tests/fixtures/empty-env.txt'] });
  t.after(() => proxy.dispose());
  const db = requireContentDatabase(proxy.env);
  const execute = async sql => db.batch(splitSql(sql).map(statement => db.prepare(statement)));
  for (const name of (await readdir('migrations')).filter(name => name.endsWith('.sql')).sort()) {
    await execute(await readFile(`migrations/${name}`, 'utf8'));
  }
  await t.test('schema includes indexes, foreign keys, and state/time constraints', async () => {
    const indexes = await db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
    for (const name of ['content_publication', 'events_start', 'audit_content_time', 'audit_time']) {
      assert.ok(indexes.results.some(row => row.name === name));
    }
    await assert.rejects(db.prepare("INSERT INTO announcements(content_id) VALUES ('missing')").run());
    const id = await createAnnouncementDraft(db, draft);
    await assert.rejects(db.prepare("UPDATE content_items SET state='unknown' WHERE id=?").bind(id).run());
    await assert.rejects(db.prepare("UPDATE content_items SET state='published' WHERE id=?").bind(id).run());
    await assert.rejects(db.prepare('UPDATE content_items SET updated_at=-1 WHERE id=?').bind(id).run());
    await assert.rejects(db.prepare("INSERT INTO events(content_id,starts_at,ends_at,timezone) VALUES (?,1,2,'UTC')").bind(id).run());
  });
  await t.test('draft creation records immutable revisions and audit atomically', async () => {
    const row = await db.prepare('SELECT id FROM content_items WHERE slug=?').bind(draft.slug).first();
    assert.equal((await db.prepare('SELECT count(*) AS n FROM content_revisions WHERE content_id=?').bind(row.id).first()).n, 1);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM audit_records WHERE content_id=?').bind(row.id).first()).n, 1);
    for (const table of ['content_revisions', 'audit_records']) {
      await assert.rejects(db.prepare(`DELETE FROM ${table} WHERE content_id=?`).bind(row.id).run());
      await assert.rejects(db.prepare(`UPDATE ${table} SET actor_id='changed' WHERE content_id=?`).bind(row.id).run());
    }
    await assert.rejects(createAnnouncementDraft(db, draft));
    assert.equal((await db.prepare('SELECT count(*) AS n FROM content_items').first()).n, 1);
    // Force the last statement to fail, proving batch rollback removes earlier writes.
    await execute("CREATE TRIGGER fail_test_audit BEFORE INSERT ON audit_records WHEN NEW.actor_id='fail-test' BEGIN SELECT RAISE(ABORT,'test failure'); END;");
    await assert.rejects(createAnnouncementDraft(db, { ...draft, slug: 'rolled-back', actorId: 'fail-test' }));
    assert.equal(await db.prepare("SELECT id FROM content_items WHERE slug='rolled-back'").first(), null);
    await execute('DROP TRIGGER fail_test_audit;');
  });
  await t.test('only due published non-fixture content is publicly fetched', async () => {
    const now = 1800000000000;
    for (const kind of ['announcement', 'event']) {
      for (const state of ['draft', 'review', 'scheduled', 'archived', 'published']) {
        const input = { ...draft, slug: `test-${kind}-${state}` };
        const id = kind === 'announcement'
          ? await createAnnouncementDraft(db, input)
          : await createEventDraft(db, { ...input, startsAt: now + 1000, endsAt: now + 2000, timezone: 'America/Toronto' });
        await db.prepare('UPDATE content_items SET state=?, published_at=? WHERE id=?').bind(state, now, id).run();
      }
      const input = { ...draft, slug: `future-${kind}` };
      const id = kind === 'announcement' ? await createAnnouncementDraft(db, input)
        : await createEventDraft(db, { ...input, startsAt: now, endsAt: now + 1000, timezone: 'UTC' });
      await db.prepare("UPDATE content_items SET state='published', published_at=? WHERE id=?").bind(now + 1, id).run();
    }
    const announcements = await getPublishedAnnouncements(db, now);
    const events = await getPublishedEvents(db, now);
    assert.deepEqual(announcements.map(row => row.slug), ['test-announcement-published']);
    assert.deepEqual(events.map(row => row.slug), ['test-event-published']);
    assert.equal(events[0].timezone, 'America/Toronto');
    assert.equal(events[0].starts_at, now + 1000);
    assert.deepEqual(Object.keys(announcements[0]).sort(), ['body_text', 'id', 'is_fixture', 'published_at', 'slug', 'title']);
    assert.equal((await getPublishedAnnouncements(db, now - 1)).length, 0);
    assert.equal((await getPublishedAnnouncements(db, now + 1, 1)).length, 1);
  });
  await t.test('fixtures are repeatable, labelled, and excluded even when published', async () => {
    const seed = await readFile('seeds/development.sql', 'utf8');
    await execute(seed);
    const count = (await db.prepare('SELECT count(*) AS n FROM content_items').first()).n;
    await execute(seed);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM content_items').first()).n, count);
    const fixtures = (await db.prepare('SELECT title FROM content_items WHERE is_fixture=1').all()).results;
    assert.equal(fixtures.length, 8);
    assert.ok(fixtures.every(row => row.title.includes('FICTIONAL DEVELOPMENT')));
    for (const query of [getPublishedAnnouncements, getPublishedEvents]) {
      assert.ok((await query(db, 2000000000000)).every(row => !row.slug.startsWith('fictional-')));
    }
  });
  await t.test('validates event instants, zones, pagination, and missing bindings', async () => {
    const input = { ...draft, slug: 'invalid-event', startsAt: 1000, endsAt: 2000, timezone: 'UTC' };
    for (const override of [{ endsAt: 999 }, { startsAt: 1.2 }, { timezone: 'not/a-zone' }, { timezone: '+01:00' }]) {
      await assert.rejects(createEventDraft(db, { ...input, ...override }));
    }
    await assert.rejects(getPublishedEvents(db, NaN));
    await assert.rejects(getPublishedAnnouncements(db, Date.now(), 101));
    assert.throws(() => requireContentDatabase({}));
  });
});

test('local operation wrapper refuses remote/config overrides', () => {
  const result = spawnSync(process.execPath, ['scripts/content-local.mjs', 'seed', '--remote'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no additional flags/);
});
