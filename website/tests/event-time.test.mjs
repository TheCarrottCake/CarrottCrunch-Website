import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventTimeChoices, resolveEventTime, reopenEventTime } from '../app/lib/event-time.ts';
import { validateEvent } from '../app/lib/event-studio.server.ts';

test('event local times reject gaps and invalid calendars/zones without adjustment', () => {
  for (const [local, zone] of [
    ['2026-03-08T02:30', 'America/Toronto'], ['2011-12-30T12:00', 'Pacific/Apia'],
    ['2026-10-04T02:15', 'Australia/Lord_Howe'], ['2026-02-29T12:00', 'UTC'],
    ['2026-13-01T12:00', 'UTC'], ['2026-10-18T24:00', 'UTC'],
    ['2026-10-18', 'UTC'], ['2026-10-18T12:00Z', 'UTC'],
    ['1969-12-31T12:00', 'UTC'], ['2026-10-18T12:00', 'Not/AZone'],
    ['2026-10-18T12:00', '+05:00'], ['2026-10-18T12:00', ''],
  ]) assert.throws(() => eventTimeChoices(local, zone), `${local} ${zone}`);
  assert.equal(eventTimeChoices('2028-02-29T12:00', 'UTC').length, 1);
});

test('repeated times require a choice, expose both offsets and preserve exact instants', () => {
  const choices = eventTimeChoices('2026-11-01T01:30:00.123', 'America/Toronto');
  assert.deepEqual(choices.map(c => [c.occurrence, c.offset]), [['earlier', '-04:00'], ['later', '-05:00']]);
  assert.throws(() => resolveEventTime('2026-11-01T01:30', 'America/Toronto', ''), /clocks go back/);
  for (const choice of choices) {
    const reopened = reopenEventTime(choice.instant, 'America/Toronto');
    assert.equal(reopened.occurrence, choice.occurrence);
    assert.equal(reopened.local, '2026-11-01T01:30:00.123');
    assert.equal(resolveEventTime(reopened.local, 'America/Toronto', reopened.occurrence), choice.instant);
  }
  const halfHour = eventTimeChoices('2026-04-05T01:45', 'Australia/Lord_Howe');
  assert.equal(halfHour[1].instant - halfHour[0].instant, 1800000);
  assert.equal(eventTimeChoices('2026-10-18T12:00', 'Asia/Kathmandu')[0].offset, '+05:45');
  assert.throws(() => resolveEventTime('2026-10-18T12:00', 'UTC', 'later'), /choose this time again/);
});

test('event validation compares UTC instants across repeated local times', () => {
  const values = { title: 'TEST ONLY', bodyText: 'TEST ONLY', startLocal: '2026-11-01T01:45', endLocal: '2026-11-01T01:15', timezone: 'America/Toronto', startOccurrence: 'earlier', endOccurrence: 'later', revision: '0' };
  const resolved = validateEvent(values);
  assert.deepEqual(resolved.errors, {});
  assert.equal(resolved.endsAt - resolved.startsAt, 1800000);
  assert.ok(validateEvent({ ...values, startOccurrence: 'later', endOccurrence: 'earlier' }).errors.endLocal);
  assert.ok(validateEvent({ ...values, startOccurrence: '' }).errors.startLocal);
  for (const [field, value] of [['title', ''], ['title', 'x'.repeat(161)], ['bodyText', ''], ['bodyText', 'x'.repeat(40001)], ['revision', '-1'], ['revision', '9007199254740992'], ['timezone', '+00:00']]) assert.ok(validateEvent({ ...values, [field]: value }).errors[field]);
});
