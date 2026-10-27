import {StudioBody} from '../components/studio-render';
import {FeaturedImageView} from '../components/featured-image';
import { data, isRouteErrorResponse, Link } from 'react-router';
import type { Route } from './+types/news-article';
import { publicContentSource } from '../lib/public-content.server';
import { getPublishedAnnouncement } from '../lib/content-db.server';
import { ContentBody } from '../components/content-body';
import { DemonstrationNotice } from '../components/news-events';

export function headers() {
  return { "Cache-Control": "no-store" };
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[a-f0-9-]{36}$/i.test(params.announcementId)) throw new Response('Article not found', { status: 404, headers });
  const { db, demonstration } = publicContentSource(context);
  if (!db) throw new Response('News is not connected in this environment', { status: 503, headers });
  let article;
  try { article = await getPublishedAnnouncement(db, params.announcementId, Date.now(), { demonstration }); }
  catch { throw new Response('News is temporarily unavailable', { status: 503, headers }); }
  if (!article) throw new Response('Article not found', { status: 404, headers });
  return data({ article, demonstration }, { headers });
}
export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'News unavailable — CarrottCrunch' }, { name: 'robots', content: 'noindex' }];
  const { article, demonstration } = loaderData;
  const title = `${article.title} — CarrottCrunch`;
  const description = article.body_text.slice(0, 160);
  return [
    { title }, { name: 'description', content: description },
    { property: 'og:title', content: title }, { property: 'og:description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'article:published_time', content: new Date(article.published_at).toISOString() },
    { name: 'twitter:card', content: 'summary' },
    ...(demonstration ? [{ name: 'robots', content: 'noindex, nofollow' }] : [{ property: 'og:url', content: `https://carrottcrunch.ca/updates/${article.id}` }]),
  ];
}
export default function NewsArticle({ loaderData }: Route.ComponentProps) {
  const { article, demonstration } = loaderData;
  return <article className="container public-page news-article">
    <Link className="text-link" to="/updates">← All news & events</Link>
    <DemonstrationNotice enabled={demonstration} />
    <header className="public-page-intro"><div className="eyebrow orange">{article.is_fixture ? 'FICTIONAL DEVELOPMENT NEWS' : 'COMMUNITY NEWS'}</div><h1>{article.title}</h1>
      <p><time dateTime={new Date(article.published_at).toISOString()}>Published {new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(article.published_at)} (UTC)</time></p>
    </header>
    <FeaturedImageView key={article.featuredImage?.id} image={article.featuredImage}/>
    {article.studioImages?<StudioBody text={article.body_text} images={article.studioImages}/>:<ContentBody text={article.body_text} />}
  </article>;
}
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <div className="container public-page"><h1>{missing ? 'Article not found' : 'News unavailable'}</h1>
    <p className="content-empty">{missing ? 'This article is not available. It may not be published.' : 'News is currently unavailable. Please try again later.'}</p>
    <Link className="button secondary" to="/updates">Back to news & events</Link>
  </div>;
}
