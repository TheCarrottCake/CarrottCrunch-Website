import { isContentDemonstration } from './content-demo';
import type { RouterContextProvider } from 'react-router';
import { contentEnvironmentContext } from './cloudflare-context.server';
import { getPublishedAnnouncements, getPublishedEvents } from './content-db.server';

export function publicContentSource(context: Readonly<RouterContextProvider>) {
  const env = context.get(contentEnvironmentContext);
  // Vite production builds cannot enable fictional content, even with this binding set.
  const demonstration = isContentDemonstration(env.CONTENT_DEMO_MODE, import.meta.env.DEV);
  return { db: env.CONTENT_DB, demonstration };
}

export async function loadPublicContent(context: Readonly<RouterContextProvider>, homepage = false) {
  const { db, demonstration } = publicContentSource(context);
  const now = Date.now();
  const empty = { announcements: [], events: [], now, demonstration };
  if (!db) return { ...empty, availability: 'unconfigured' as const };
  try {
    const [announcements, events] = await Promise.all([
      getPublishedAnnouncements(db, now, homepage ? 3 : 100, { demonstration }),
      getPublishedEvents(db, now, homepage ? 3 : 100, { demonstration, upcomingOnly: homepage }),
    ]);
    return { announcements, events, now, demonstration, availability: 'ready' as const };
  } catch {
    // Never serialize database errors, SQL, bindings, or private content to visitors.
    console.error('Public content query failed');
    return { ...empty, availability: 'unavailable' as const };
  }
}
