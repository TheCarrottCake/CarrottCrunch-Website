import {EditorialHeader} from '../components/public-page';
import { data } from 'react-router';
import type { Route } from './+types/updates';
import { loadPublicContent } from '../lib/public-content.server';
import { ContentAvailability, DemonstrationNotice, EventCard, NewsItem } from '../components/news-events';
import { eventStatus } from '../lib/event-display';

export function headers() {
  return { "Cache-Control": "no-store" };
}

export async function loader({ context }: Route.LoaderArgs) {
  const content = await loadPublicContent(context);
  return data(content, { status: content.availability === 'unavailable' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
export function meta({ loaderData }: Route.MetaArgs) {
  const title = 'News & Events — CarrottCrunch';
  const description = 'Read published CarrottCrunch news and explore community events.';
  return [
    { title }, { name: 'description', content: description },
    { property: 'og:title', content: title }, { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    ...(loaderData?.demonstration ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
  ];
}
export default function Updates({ loaderData }: Route.ComponentProps) {
  const { announcements, events, now, demonstration, availability } = loaderData;
  return <div className="v3-container v3-page v3-updates">
    <EditorialHeader eyebrow="FRESH FROM THE PATCH" title="News & " accent="Events." description="Published news and shared plans, all in one place."/>

    <DemonstrationNotice enabled={demonstration} />
    <ContentAvailability availability={availability} />
    <section aria-labelledby="announcements-title" className="content-section">
      <h2 id="announcements-title">Latest news</h2>
      <div className="v3-news-grid">{announcements.map(article => <NewsItem key={article.id} article={article} />)}</div>
      {availability === 'ready' && announcements.length === 0 && <p className="content-empty">No published news yet. Check back later.</p>}
    </section>
    <section id="events" aria-labelledby="events-title" className="content-section">
      <h2 id="events-title">Events</h2>
      {(['Upcoming', 'In progress', 'Completed', 'Cancelled'] as const).map(status => {
        const items = events.filter(event => eventStatus(event, now) === status);
        return items.length > 0 ? <section key={status} aria-label={`${status} events`} className="event-group">
          <h3>{status}</h3><div className="v3-news-grid">{items.map(event => <EventCard key={event.id} event={event} now={now} />)}</div>
        </section> : null;
      })}
      {availability === 'ready' && events.length === 0 && <p className="content-empty">No published events yet. Check back later.</p>}
    </section>
  </div>;
}
