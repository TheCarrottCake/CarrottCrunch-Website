export type EventTiming = {
  starts_at: number; ends_at: number; timezone: string; event_state: 'active' | 'cancelled';
};
export type EventStatus = 'Upcoming' | 'In progress' | 'Completed' | 'Cancelled';
export function eventStatus(event: EventTiming, now: number): EventStatus {
  if (event.event_state === 'cancelled') return 'Cancelled';
  if (event.ends_at <= now) return 'Completed';
  return event.starts_at <= now ? 'In progress' : 'Upcoming';
}
export function formatEventTime(instant: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'longOffset',
  }).format(instant);
}
