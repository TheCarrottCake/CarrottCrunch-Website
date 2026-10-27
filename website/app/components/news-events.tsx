import {StudioBody} from './studio-render';
import {FeaturedImageView} from './featured-image';
import { Link } from 'react-router';
import type { PublishedAnnouncement, PublishedEvent } from '../lib/content-db.server';
import { eventStatus, formatEventTime } from '../lib/event-display';
import { ContentBody } from './content-body';

export function DemonstrationNotice({ enabled }: { enabled: boolean }) {
  return enabled ? <p className="content-notice" role="note">Development demonstration · All content shown here is fictional, not actual CarrottCrunch news or events.</p> : null;
}

export function ContentAvailability({ availability }: { availability: 'ready' | 'unconfigured' | 'unavailable' }) {
  if (availability === 'ready') return null;
  return <p className="content-notice" role="status">{availability === 'unavailable'
    ? 'News and events are temporarily unavailable. Please try again later.'
    : 'News and events are not available yet.'}</p>;
}

export function NewsItem({ article, compact = false }: { article: PublishedAnnouncement; compact?: boolean }) {
  const date = new Date(article.published_at);
  return <article className={compact ? 'news-item' : 'public-card'}>
    {compact && <div className="news-date" aria-hidden="true">{new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date)}<br /><strong>{date.getUTCDate()}</strong></div>}
    <div>
      <FeaturedImageView key={article.featuredImage?.id} image={article.featuredImage} compact/>
      <span className="micro orange">{article.is_fixture ? 'FICTIONAL DEVELOPMENT NEWS' : 'COMMUNITY NEWS'}</span>
      <h3><Link to={`/updates/${article.id}`}>{article.title}</Link></h3>
      <p><time dateTime={date.toISOString()}>Published {new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(date)} (UTC)</time></p>
      <p>{article.body_text.replace(/!\[([^\]]*)\]\(media:[a-f0-9-]{36}\)/g,'$1').replace(/[*#`]/g,'').slice(0,180)}{article.body_text.length > 180 ? '…' : ''}</p>
      <Link className="text-link" to={`/updates/${article.id}`}>Read article <span aria-hidden="true">↗</span><span className="sr-only">: {article.title}</span></Link>
    </div>
  </article>;
}

export type EventPresentation = Pick<PublishedEvent, 'title' | 'body_text' | 'is_fixture' | 'starts_at' | 'ends_at' | 'timezone' | 'event_state' | 'featuredImage' | 'studioImages' | 'location'>;
export function EventCard({ event, now, compact = false }: { event: EventPresentation; now: number; compact?: boolean }) {
  const status = eventStatus(event, now);
  return <article className={compact ? 'event-summary' : 'public-card'}>
    <FeaturedImageView key={event.featuredImage?.id} image={event.featuredImage} compact/>
    <span className="micro orange">{event.is_fixture ? 'FICTIONAL DEVELOPMENT EVENT · ' : ''}{status}</span>
    <h4>{event.title}</h4>
    <p className="event-time">
      <time dateTime={new Date(event.starts_at).toISOString()}>{formatEventTime(event.starts_at, event.timezone)}</time>
      {' – '}<time dateTime={new Date(event.ends_at).toISOString()}>{formatEventTime(event.ends_at, event.timezone)}</time>
      <br /><span>Timezone: {event.timezone}</span>
    </p>
    {event.location&&<p>{event.location}</p>}{!compact && (event.studioImages?<StudioBody text={event.body_text} images={event.studioImages}/>:<ContentBody text={event.body_text} />)}
  </article>;
}
