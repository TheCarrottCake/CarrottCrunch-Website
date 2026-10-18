import { Temporal } from '@js-temporal/polyfill';
import { resolveEventTime, reopenEventTime, eventTimeChoices } from '../../app/lib/event-time';

export default {
  async fetch() {
    const local = Temporal.PlainDateTime.from('2026-11-01T01:30');
    const earlier = local.toZonedDateTime('America/Toronto', { disambiguation: 'earlier' });
    const later = local.toZonedDateTime('America/Toronto', { disambiguation: 'later' });
    let gapRejected = false;
    let applicationGapRejected = false, applicationAmbiguityRejected = false;
    try {
      Temporal.PlainDateTime.from('2026-03-08T02:30').toZonedDateTime('America/Toronto', { disambiguation: 'reject' });
    } catch { gapRejected = true; }
    try { eventTimeChoices('2026-03-08T02:30', 'America/Toronto'); } catch { applicationGapRejected = true; }
    try { resolveEventTime('2026-11-01T01:30', 'America/Toronto', ''); } catch { applicationAmbiguityRejected = true; }
    const halfHour = Temporal.PlainDateTime.from('2026-04-05T01:45');
    return Response.json({
      earlier: { offset: earlier.offset, instant: earlier.toInstant().toString() },
      later: { offset: later.offset, instant: later.toInstant().toString() },
      gapRejected,
      halfHourDifference: halfHour.toZonedDateTime('Australia/Lord_Howe', { disambiguation: 'later' }).epochMilliseconds
        - halfHour.toZonedDateTime('Australia/Lord_Howe', { disambiguation: 'earlier' }).epochMilliseconds,
      fractionalOffset: Temporal.PlainDateTime.from('2026-10-18T12:00').toZonedDateTime('Asia/Kathmandu').offset,
      applicationRoundTrip: resolveEventTime(reopenEventTime(later.epochMilliseconds, 'America/Toronto').local, 'America/Toronto', 'later') === later.epochMilliseconds,
      applicationOffsets: eventTimeChoices('2026-11-01T01:30', 'America/Toronto').map(choice => choice.offset),
      applicationGapRejected, applicationAmbiguityRejected,
    });
  },
};
