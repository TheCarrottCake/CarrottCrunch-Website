// Post-build check of real route loaders/actions with isolated D1 and mocked Discord.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { beginDiscordLogin, finishDiscordLogin } from '../app/lib/staff-auth.server.ts';
import { createEventDraft } from '../app/lib/content-db.server.ts';

const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', environment: 'content_dev', persist: false, remoteBindings: false, envFiles: ['tests/fixtures/empty-env.txt'] });
try {
  const db = proxy.env.CONTENT_DB;
  for (const name of (await readdir('migrations')).filter(name => name.endsWith('.sql')).sort()) await db.batch(splitSql(await readFile(`migrations/${name}`, 'utf8')).map(sql => db.prepare(sql)));
  const bundles = (await readdir('build/server/assets')).filter(name => name.startsWith('server-build-') && name.endsWith('.js'));
  assert.equal(bundles.length, 1, 'Run npm run build first');
  const build = await import(pathToFileURL(resolve('build/server/assets', bundles[0])).href);
  // These documents contain native sign-in/logout or authenticated mutation forms.
  for (const name of ['login', 'account', 'control', 'control-media', 'control-media-detail', 'control-news', 'control-news-new', 'control-news-detail', 'control-events-new', 'control-events-detail']) {
    const headers = new Headers(build.routes[`routes/${name}`].module.headers());
    assert.equal(headers.get('Referrer-Policy'), 'same-origin', `${name} form document policy`);
  }
  const control = build.routes['routes/control'].module;
  const logout = build.routes['routes/control-logout'].module;
  const origin = 'https://staff.example.test';
  const env = { CONTENT_DB: db, CONTROL_ORIGIN: origin, DISCORD_CLIENT_ID: '100000000000000099', DISCORD_CLIENT_SECRET: 'fictional-client-secret', AUTH_CSRF_SECRET: 'fictional-csrf-secret-32-characters-long', INITIAL_OWNER_DISCORD_ID: '100000000000000001' };
  const context = { get: () => env };
  await assert.rejects(control.loader({ request: new Request(origin + '/control'), context, params: {} }), result => result.status === 302 && result.headers.get('Location') === '/login');
  const start = await beginDiscordLogin(new Request(origin + '/control/auth/start', { method: 'POST', headers: { Origin: origin } }), env);
  const state = new URL(start.headers.get('Location')).searchParams.get('state');
  const cookie = start.headers.getSetCookie()[0].split(';')[0];
  const response = await finishDiscordLogin(new Request(`${origin}/control/auth/callback?state=${state}&code=test-code`, { headers: { Cookie: cookie } }), env, false, async input => {
    if (String(input).endsWith('/token/revoke')) return new Response(null);
    if (String(input).endsWith('/token')) return Response.json({ access_token: 'fictional-access-token', token_type: 'Bearer', scope: 'identify', expires_in: 3600 });
    return Response.json({ id: env.INITIAL_OWNER_DISCORD_ID, username: 'fictional_staff', global_name: 'Fictional Staff' });
  });
  assert.equal(response.headers.get('Location'), '/control');
  const sessionCookie = response.headers.getSetCookie().map(value => value.split(';')[0]).filter(value => !value.endsWith('=')).join('; ');
  const request = new Request(origin + '/control', { headers: { Cookie: sessionCookie } });
  const result = await control.loader({ request, context, params: {} });
  assert.deepEqual(Object.keys(result.data).sort(), ['csrf', 'identity', 'role']);
  assert.deepEqual(result.data.identity, { username: 'fictional_staff', displayName: 'Fictional Staff' });
  assert.equal(result.data.role, 'Owner');
  assert.doesNotMatch(JSON.stringify(result.data), /token_hash|discord_user_id|fictional-access-token|fictional-client-secret/);
  const staffHeader = await build.routes['routes/public-layout'].module.loader({ request, context, params: {} });
  assert.equal(staffHeader.data.account.canAccessControl, true);
  assert.doesNotMatch(JSON.stringify(staffHeader.data), /token_hash|discord_user_id|access_token|client_secret/);
  const studio = build.routes['routes/control-news'].module;
  const newAnnouncement = build.routes['routes/control-news-new'].module;
  const editAnnouncement = build.routes['routes/control-news-detail'].module;
  for (const route of [studio, newAnnouncement, editAnnouncement]) {
    await assert.rejects(route.loader({ request: new Request(origin + '/control/news'), context, params: { announcementId: crypto.randomUUID() } }), error => error.status === 403);
  }
  const studioRequest = path => new Request(origin + path, { headers: { Cookie: sessionCookie } });
  const studioPost = (fields, csrf = result.data.csrf) => new Request(origin + '/control/news/new', {
    method: 'POST', headers: { Origin: origin, Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, _csrf: csrf, intent: 'save', ...(fields.startLocal !== undefined ? { eventDate: fields.startLocal.split('T')[0], startTime: fields.startLocal.split('T')[1]?.slice(0,5) || '', endTime: fields.endLocal.split('T')[1]?.slice(0,5) || '', endDate: '' } : {}) }),
  });
  assert.equal((await studio.loader({ request: studioRequest('/control/news'), context, params: {} })).data.items.length, 0);
  assert.equal((await newAnnouncement.loader({ request: studioRequest('/control/news/new'), context, params: {} })).data.role, 'Owner');
  const fields = { title: 'TEST ONLY built route draft', summary: 'TEST ONLY summary', bodyText: '**TEST ONLY** body', revision: '0' };
  await assert.rejects(newAnnouncement.action({ request: studioPost(fields, 'bad'), context, params: {} }), error => error.status === 403);
  const invalidDraft = await newAnnouncement.action({ request: studioPost({ ...fields, title: '' }), context, params: {} });
  assert.equal(invalidDraft.init.status, 400); assert.equal(invalidDraft.data.values.bodyText, fields.bodyText);
  const createdDraft = await newAnnouncement.action({ request: studioPost(fields), context, params: {} });
  assert.equal(createdDraft.status, 303);
  const announcementId = createdDraft.headers.get('Location').split('/').at(-1).split('?')[0];
  const draftArgs = { request: studioRequest(`/control/news/${announcementId}`), context, params: { announcementId } };
  const loadedDraft = await editAnnouncement.loader(draftArgs);
  assert.equal(loadedDraft.data.draft.summary, fields.summary);
  assert.equal(loadedDraft.data.history.length, 1);
  assert.doesNotMatch(JSON.stringify(loadedDraft.data), /token_hash|actor_id|discord_user_id|client_secret/);
  const savedDraft = await editAnnouncement.action({ ...draftArgs, request: studioPost({ ...fields, revision: '1', title: 'TEST ONLY saved draft' }) });
  assert.equal(savedDraft.status, 303);
  const staleDraft = await editAnnouncement.action({ ...draftArgs, request: studioPost({ ...fields, revision: '1', bodyText: 'TEST ONLY unsaved text' }) });
  assert.equal(staleDraft.init.status, 409); assert.equal(staleDraft.data.values.bodyText, 'TEST ONLY unsaved text');
  assert.equal((await editAnnouncement.loader(draftArgs)).data.history.length, 2);
  assert.equal((await studio.loader({ request: studioRequest('/control/news?q=saved'), context, params: {} })).data.items[0].id, announcementId);
  const publicArticle = build.routes['routes/news-article'].module;
  await assert.rejects(publicArticle.loader({ request: new Request(origin + `/updates/${announcementId}`), context, params: { announcementId } }), error => error.status === 404);
  const updates = await build.routes['routes/updates'].module.loader({ request: new Request(origin + '/updates'), context, params: {} });
  assert.equal(updates.data.announcements.length, 0);
  const newEvent = build.routes['routes/control-events-new'].module;
  const editEvent = build.routes['routes/control-events-detail'].module;
  for (const route of [newEvent, editEvent]) await assert.rejects(route.loader({ request: new Request(origin + '/control/events/new'), context, params: { eventId: crypto.randomUUID() } }), error => error.status === 403);
  const existingEventId = await createEventDraft(db, { slug: 'test-existing-published-event', title: 'TEST ONLY existing published event', bodyText: 'TEST ONLY existing body', actorId: 'test-author', startsAt: Date.now() + 3600000, endsAt: Date.now() + 7200000, timezone: 'UTC' });
  await db.prepare("UPDATE content_items SET state='published',published_at=1 WHERE id=?").bind(existingEventId).run();
  const publicBefore = (await build.routes['routes/updates'].module.loader({ request: new Request(origin + '/updates'), context, params: {} })).data;
  const eventFields = { title: 'TEST ONLY built event', bodyText: '**TEST ONLY** event body', startLocal: '2026-11-01T01:30', endLocal: '2026-11-01T02:30', timezone: 'America/Toronto', startOccurrence: 'later', endOccurrence: '', revision: '0' };
  assert.equal((await newEvent.loader({ request: studioRequest('/control/events/new'), context, params: {} })).data.role, 'Owner');
  await assert.rejects(newEvent.action({ request: studioPost(eventFields, 'bad'), context, params: {} }), error => error.status === 403);
  const invalidEvent = await newEvent.action({ request: studioPost({ ...eventFields, startOccurrence: '' }), context, params: {} });
  assert.equal(invalidEvent.init.status, 400); assert.equal(invalidEvent.data.values.bodyText, eventFields.bodyText);
  const createdEvent = await newEvent.action({ request: studioPost(eventFields), context, params: {} });
  assert.equal(createdEvent.status, 303);
  const eventId = createdEvent.headers.get('Location').split('/').at(-1).split('?')[0];
  const eventArgs = { request: studioRequest(`/control/events/${eventId}`), context, params: { eventId } };
  const loadedEvent = (await editEvent.loader(eventArgs)).data;
  assert.deepEqual(loadedEvent.values, { ...eventFields, revision: '1' });
  assert.equal(loadedEvent.draft.starts_at, Date.parse('2026-11-01T06:30:00.000Z'));
  assert.doesNotMatch(JSON.stringify(loadedEvent), /actor_id|discord_user_id|token_hash|client_secret/);
  const savedEvent = await editEvent.action({ ...eventArgs, request: studioPost({ ...eventFields, revision: '1', title: 'TEST ONLY changed event' }) });
  assert.equal(savedEvent.status, 303);
  const staleEvent = { ...eventFields, revision: '1', bodyText: 'TEST ONLY unsaved event', startOccurrence: 'earlier' };
  const conflictingEvent = await editEvent.action({ ...eventArgs, request: studioPost(staleEvent) });
  assert.equal(conflictingEvent.init.status, 409); assert.deepEqual(conflictingEvent.data.values, staleEvent);
  const latestEvent = (await editEvent.loader(eventArgs)).data;
  assert.equal(latestEvent.history.length, 2); assert.equal(latestEvent.draft.starts_at, loadedEvent.draft.starts_at);
  assert.equal(latestEvent.values.startOccurrence, 'later');
  const eventListing = (await studio.loader({ request: studioRequest('/control/news?kind=event&q=changed'), context, params: {} })).data;
  assert.equal(eventListing.kind, 'event'); assert.equal(eventListing.items[0].id, eventId);
  assert.equal((await studio.loader({ request: studioRequest('/control/news'), context, params: {} })).data.items.length, 1);
  const legacyStart = Date.parse('2026-11-01T06:17:42.123Z'), legacyEnd = Date.parse('2026-11-01T07:32:12.456Z');
  const legacyId = await createEventDraft(db, { slug: 'test-legacy-scheduling', title: 'TEST ONLY legacy schedule', bodyText: 'TEST ONLY', actorId: 'test-author', startsAt: legacyStart, endsAt: legacyEnd, timezone: 'UTC' });
  const legacyArgs = { request: studioRequest(`/control/events/${legacyId}`), context, params: { eventId: legacyId } };
  const legacy = (await editEvent.loader(legacyArgs)).data;
  assert.equal(legacy.values.timezone, 'America/Toronto'); assert.equal(legacy.values.startOccurrence, 'later');
  assert.equal((await editEvent.action({ ...legacyArgs, request: studioPost({ ...legacy.values, bodyText: 'TEST ONLY edited body' }) })).status, 303);
  const retained = (await editEvent.loader(legacyArgs)).data;
  assert.equal(retained.draft.starts_at, legacyStart); assert.equal(retained.draft.ends_at, legacyEnd);
  await assert.rejects(publicArticle.loader({ request: new Request(origin + `/updates/${eventId}`), context, params: { announcementId: eventId } }), error => error.status === 404);
  const publicAfter = (await build.routes['routes/updates'].module.loader({ request: new Request(origin + '/updates'), context, params: {} })).data;
  assert.deepEqual(publicAfter.events, publicBefore.events); assert.deepEqual(publicAfter.announcements, publicBefore.announcements);
  const homepage = (await build.routes['routes/home'].module.loader({ request: new Request(origin + '/'), context, params: {} })).data;
  assert.ok(homepage.events.every(event => event.id !== eventId));
  const protectedEvent = await editEvent.action({ request: studioPost({ ...eventFields, revision: '1' }), context, params: { eventId: existingEventId } });
  assert.equal(protectedEvent.init.status, 404);
  const loggedOut = await logout.action({ request: new Request(origin + '/control/logout', { method: 'POST', headers: { Origin: origin, Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `_csrf=${result.data.csrf}` }), context, params: {} });
  assert.equal(loggedOut.status, 303);
  await assert.rejects(control.loader({ request, context, params: {} }), result => result.status === 302);
  const memberStart = await beginDiscordLogin(new Request(origin + '/auth/start', { method: 'POST', headers: { Origin: origin } }), env);
  const memberState = new URL(memberStart.headers.get('Location')).searchParams.get('state');
  const memberCookie = memberStart.headers.getSetCookie()[0].split(';')[0];
  const memberResponse = await finishDiscordLogin(new Request(`${origin}/control/auth/callback?state=${memberState}&code=test-code`, { headers: { Cookie: memberCookie } }), env, false, async input => {
    if (String(input).endsWith('/token/revoke')) return new Response(null);
    if (String(input).endsWith('/token')) return Response.json({ access_token: 'fictional-member-token', token_type: 'Bearer', scope: 'identify', expires_in: 3600 });
    return Response.json({ id: '100000000000000002', username: 'fictional_member', global_name: 'Fictional Member', avatar: 'a'.repeat(32) });
  });
  assert.equal(memberResponse.headers.get('Location'), '/account');
  const memberJar = memberResponse.headers.getSetCookie().map(value => value.split(';')[0]).filter(value => !value.endsWith('=')).join('; ');
  const memberRequest = new Request(origin + '/account', { headers: { Cookie: memberJar } });
  const account = build.routes['routes/account'].module;
  const publicLayout = build.routes['routes/public-layout'].module;
  const memberData = await account.loader({ request: memberRequest, context, params: {} });
  assert.equal(memberData.data.account.canAccessControl, false);
  assert.equal(memberData.data.account.username, 'fictional_member');
  assert.match(memberData.data.account.avatarUrl, /^https:\/\/cdn.discordapp.com\/avatars\//);
  assert.doesNotMatch(JSON.stringify(memberData.data), /token_hash|discord_user_id|access_token|client_secret/);
  const publicData = await publicLayout.loader({ request: memberRequest, context, params: {} });
  assert.deepEqual(Object.keys(publicData.data.account).sort(), ['avatarUrl', 'canAccessControl', 'csrf', 'displayName', 'username']);
  assert.equal((await publicLayout.loader({ request: new Request(origin + '/'), context, params: {} })).data.account, null);
  for (const route of [studio, newAnnouncement, editAnnouncement]) {
    await assert.rejects(route.loader({ request: memberRequest, context, params: { announcementId } }), error => error.status === 403);
  }
  for (const route of [newEvent, editEvent]) {
    await assert.rejects(route.loader({ request: memberRequest, context, params: { eventId } }), error => error.status === 403);
    await assert.rejects(route.action({ request: new Request(origin + '/control/events/new', { method: 'POST', headers: { Origin: origin, Cookie: memberJar, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...eventFields, _csrf: memberData.data.csrf, intent: 'save' }) }), context, params: { eventId } }), error => error.status === 403);
  }
  await assert.rejects(control.loader({ request: memberRequest, context, params: {} }), error => error.status === 403);
  await assert.rejects(account.loader({ request: new Request(origin + '/account'), context, params: {} }), error => error.status === 302 && error.headers.get('Location') === '/login');
  assert.equal((await build.routes['routes/control-login'].module.loader()).headers.get('Location'), '/login');
  const memberLogout = await build.routes['routes/logout'].module.action({ request: new Request(origin + '/logout', { method: 'POST', headers: { Origin: origin, Cookie: memberJar, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `_csrf=${memberData.data.csrf}` }), context, params: {} });
  assert.equal(memberLogout.status, 303);
  await assert.rejects(account.loader({ request: memberRequest, context, params: {} }), error => error.status === 302);
  for (const name of (await readdir('build/client/assets')).filter(name => name.endsWith('.js'))) {
    assert.doesNotMatch(await readFile(`build/client/assets/${name}`, 'utf8'), /DISCORD_CLIENT_SECRET|AUTH_CSRF_SECRET|staff_oauth_transactions|staff_sessions|site_sessions/);
  }
  console.log('Built member/control loader/action checks passed: announcement and event drafts, exact timing, 400/409 preservation, published-event protection, public isolation, staff/member boundaries, logout revocation, and server-only authentication code.');
} finally { await proxy.dispose(); }
