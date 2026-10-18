import { Temporal } from '@js-temporal/polyfill';

export const EVENT_TIMEZONE = 'America/Toronto';
export function clockLabel(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
export const eventTimeOptions = Array.from({ length: 96 }, (_, index) => {
  const value = `${String(Math.floor(index / 4)).padStart(2, '0')}:${String(index % 4 * 15).padStart(2, '0')}`;
  return { value, label: clockLabel(value) };
});
export function formatTorontoDateTime(instant: number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TIMEZONE, month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(instant);
}
export function eventScheduleSummary(start: number, end: number): string {
  const startTime = reopenEventTime(start, EVENT_TIMEZONE), endTime = reopenEventTime(end, EVENT_TIMEZONE);
  const startDate = startTime.local.slice(0, 10);
  const endDate = endTime.local.slice(0, 10);
  const endLabel = startDate === endDate ? new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(end) : formatTorontoDateTime(end);
  const occurrenceLabel = (occurrence: Occurrence) => occurrence ? ` (${occurrence === 'earlier' ? 'first' : 'second'} time)` : '';
  return `${formatTorontoDateTime(start)}${occurrenceLabel(startTime.occurrence)} – ${endLabel}${occurrenceLabel(endTime.occurrence)} (Toronto time)`;
}

export type Occurrence = '' | 'earlier' | 'later';
export type TimeChoice = { occurrence: Occurrence; instant: number; offset: string };

export function eventTimeChoices(local: string, timezone: string): TimeChoice[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(local)) throw new Error('Enter a complete date and time.');
  if (!timezone || timezone.length > 100 || /^[+-]/.test(timezone) || timezone === 'Z') throw new Error('Enter a valid IANA timezone, such as America/Toronto.');
  let plain: Temporal.PlainDateTime;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    plain = Temporal.PlainDateTime.from(local, { overflow: 'reject' });
  } catch { throw new Error('Enter a valid calendar date and IANA timezone.'); }
  const earlier = plain.toZonedDateTime(timezone, { disambiguation: 'earlier' });
  const later = plain.toZonedDateTime(timezone, { disambiguation: 'later' });
  // A gap produces adjusted local times. Never accept either adjustment.
  if (!earlier.toPlainDateTime().equals(plain) || !later.toPlainDateTime().equals(plain)) throw new Error('The clocks jump forward past this time. Please choose another time.');
  if (earlier.epochMilliseconds < 0 || later.epochMilliseconds < 0) throw new Error('Choose a date on or after January 1, 1970 (UTC).');
  const choice = (value: Temporal.ZonedDateTime, occurrence: Occurrence): TimeChoice => ({ occurrence, instant: value.epochMilliseconds, offset: value.offset });
  return earlier.epochMilliseconds === later.epochMilliseconds ? [choice(earlier, '')] : [choice(earlier, 'earlier'), choice(later, 'later')];
}

export function resolveEventTime(local: string, timezone: string, occurrence: string): number {
  const choices = eventTimeChoices(local, timezone);
  const selected = choices.find(choice => choice.occurrence === occurrence);
  if (!selected) throw new Error(choices.length > 1 ? 'The clocks go back at this time. Please choose the first or second time.' : 'Please choose this time again.');
  return selected.instant;
}

export function reopenEventTime(instant: number, timezone: string): { local: string; occurrence: Occurrence } {
  const zoned = Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(timezone);
  const local = zoned.toPlainDateTime().toString({ smallestUnit: 'millisecond' });
  const choice = eventTimeChoices(local, timezone).find(candidate => candidate.instant === instant);
  if (!choice) throw new Error('The saved event time cannot be resolved.');
  return { local, occurrence: choice.occurrence };
}
