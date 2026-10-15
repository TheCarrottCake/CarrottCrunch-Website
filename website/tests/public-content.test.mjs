import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentBody, safeContentHref } from '../app/components/content-body.ts';
import { eventStatus, formatEventTime } from '../app/lib/event-display.ts';
import { isContentDemonstration } from '../app/lib/content-demo.ts';
import { createAnnouncementDraft, createEventDraft, getPublishedAnnouncement, getPublishedAnnouncements, getPublishedEvents } from '../app/lib/content-db.server.ts';

const now = 1800000000000;
const draft = { slug: 'test', title: 'TEST ONLY', bodyText: 'Published text', actorId: 'test-actor' };

test('public content visibility and event ordering on real local D1', async t => {
  const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', environment: 'content_dev', persist: false, remoteBindings: false, envFiles: [] });
  t.after(() => proxy.dispose());
  const db = proxy.env.CONTENT_DB;
  for (const name of (await readdir('migrations')).filter(name => name.endsWith('.sql')).sort()) {
    await db.batch(splitSql(await readFile(`migrations/${name}`, 'utf8')).map(sql => db.prepare(sql)));
  }
  const publish = (id, time, state = 'published') => db.prepare('UPDATE content_items SET state=?,published_at=? WHERE id=?').bind(state, time, id).run();
  const newest = await createAnnouncementDraft(db, { ...draft, slug: 'newest' });
  const older = await createAnnouncementDraft(db, { ...draft, slug: 'older' });
  await publish(older, now - 2); await publish(newest, now - 1);
  const hidden = [];
  for (const state of ['draft', 'review', 'scheduled', 'archived', 'future']) {
    const id = await createAnnouncementDraft(db, { ...draft, slug: state });
    await publish(id, state === 'future' ? now + 1 : now - 1, state === 'future' ? 'published' : state);
    hidden.push(id);
  }
  await db.prepare('INSERT INTO content_revisions(id,content_id,revision,snapshot_json,actor_id,created_at) VALUES (?,?,2,?,?,?)')
    .bind(crypto.randomUUID(), newest, JSON.stringify({ body_text: 'PRIVATE UNPUBLISHED REVISION' }), 'private-actor', now).run();
  assert.deepEqual((await getPublishedAnnouncements(db, now)).map(row => row.id), [newest, older]);
  assert.equal((await getPublishedAnnouncement(db, newest, now)).body_text, 'Published text');
  for (const id of [...hidden, 'missing', "' OR 1=1 --"]) assert.equal(await getPublishedAnnouncement(db, id, now), null);
  assert.doesNotMatch(JSON.stringify(await getPublishedAnnouncements(db, now)), /PRIVATE|private-actor/);
  const eventIds = {};
  for (const [slug, start, end, state] of [
    ['later', now + 10000, now + 20000, 'active'],
    ['completed-old', now - 40000, now - 30000, 'active'],
    ['upcoming', now + 1000, now + 2000, 'active'],
    ['completed-new', now - 20000, now - 10000, 'active'],
    ['cancelled', now + 100, now + 200, 'cancelled'],
    ['ongoing', now - 1000, now + 500, 'active'],
  ]) {
    const id = await createEventDraft(db, { ...draft, slug, startsAt: start, endsAt: end, timezone: 'America/Toronto' });
    eventIds[slug] = id;
    await publish(id, now - 1);
    await db.prepare('UPDATE events SET event_state=? WHERE content_id=?').bind(state, id).run();
  }
  const all = await getPublishedEvents(db, now);
  assert.deepEqual(all.map(row => row.slug), ['ongoing', 'upcoming', 'later', 'completed-new', 'completed-old', 'cancelled']);
  assert.deepEqual(all.map(row => eventStatus(row, now)), ['In progress', 'Upcoming', 'Upcoming', 'Completed', 'Completed', 'Cancelled']);
  assert.deepEqual((await getPublishedEvents(db, now, 3, { upcomingOnly: true })).map(row => row.slug), ['upcoming', 'later']);
  await assert.rejects(db.prepare("UPDATE events SET event_state='invalid' WHERE content_id=?").bind(eventIds.cancelled).run());
  const seed = await readFile('seeds/development.sql', 'utf8');
  await db.batch(splitSql(seed).map(sql => db.prepare(sql)));
  const demo = { demonstration: true };
  const demoNews = await getPublishedAnnouncements(db, now, 100, demo);
  assert.ok(demoNews.length > 0);
  assert.ok(demoNews.every(row => row.is_fixture === 1 && row.title.includes('FICTIONAL DEVELOPMENT')));
  assert.ok(demoNews.every(row => !row.slug.includes('draft') && !row.slug.includes('future')));
  assert.equal(await getPublishedAnnouncement(db, demoNews[0].id, now), null);
  assert.ok(await getPublishedAnnouncement(db, demoNews[0].id, now, demo));
  const draftFixture = await db.prepare("SELECT id FROM content_items WHERE slug='fictional-development-announcement-draft'").first();
  assert.equal(await getPublishedAnnouncement(db, draftFixture.id, now, demo), null);
  const demoEvents = await getPublishedEvents(db, now, 100, demo);
  assert.deepEqual(new Set(demoEvents.map(event => eventStatus(event, now))), new Set(['Upcoming', 'Completed', 'Cancelled']));
  assert.ok((await getPublishedEvents(db, now, 100)).every(row => row.is_fixture === 0));
});

test('rich text uses a safe subset and escapes arbitrary HTML', () => {
  const html = renderToStaticMarkup(createElement(ContentBody, { text: '## Heading\n\n**Bold** and *emphasis* and `code`\n\n- First\n- Second\n\n[Safe](https://example.com) [Bad](javascript:alert(1))\n\n<script>alert(1)</script><img src=x onerror=alert(1)>' }));
  for (const tag of ['<h2>Heading</h2>', '<strong>Bold</strong>', '<em>emphasis</em>', '<code>code</code>', '<ul>']) assert.ok(html.includes(tag));
  assert.match(html, /href="https:\/\/example.com\/"/);
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
  for (const href of ['javascript:alert(1)', 'data:text/html,x', '//example.com', '/\\example.com', 'https://user:pass@example.com', 'http://example.com']) assert.equal(safeContentHref(href), null);
  assert.equal(safeContentHref('/updates'), '/updates');
});

test('event labels handle boundaries, cancellation, and timezone DST offsets', () => {
  const event = { starts_at: 1000, ends_at: 2000, timezone: 'America/Toronto', event_state: 'active' };
  assert.equal(eventStatus(event, 999), 'Upcoming');
  assert.equal(eventStatus(event, 1000), 'In progress');
  assert.equal(eventStatus(event, 2000), 'Completed');
  assert.equal(eventStatus({ ...event, event_state: 'cancelled' }, 999), 'Cancelled');
  assert.match(formatEventTime(Date.parse('2026-01-01T12:00:00Z'), event.timezone), /GMT-05:00/);
  assert.match(formatEventTime(Date.parse('2026-07-01T12:00:00Z'), event.timezone), /GMT-04:00/);
  assert.equal(isContentDemonstration('true', false), false);
  assert.equal(isContentDemonstration('false', true), false);
  assert.equal(isContentDemonstration(undefined, true), false);
  assert.equal(isContentDemonstration('true', true), true);
});
