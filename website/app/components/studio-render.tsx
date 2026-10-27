import { ContentBody } from './content-body';
import type { StudioImage, StudioSnapshot, StudioKind } from '../lib/studio-model';
export function StudioFigure({ image, alt, gallery = false }: {
    image?: StudioImage;
    alt?: string;
    gallery?: boolean;
}) { if (!image)
    return null; const credit = [gallery ? image.creator : '',image.requiredCredit].filter(Boolean).join(' / '); return <figure className="featured-image"><img src={image.src} alt={alt || image.alt || 'Community image'} width={image.width || 1280} height={image.height || 720} loading="lazy" decoding="async"/>{credit && <figcaption>{credit}{image.source && <> · <a href={image.source} rel="noreferrer">Source</a></>}</figcaption>}</figure>; }
export function StudioBody({ text, images }: {
    text: string;
    images: Record<string, StudioImage>;
}) { const blocks = text.replace(/\r\n/g, '\n').split(/(!\[[^\]\n]{0,1000}\]\(media:[a-f0-9-]{36}\))/g); return <>{blocks.map((block, i) => { const match = block.match(/^!\[([^\]]*)\]\(media:([a-f0-9-]{36})\)$/); if (match) {
    const image = Object.values(images).find(image => image.assetId === match[2]);
    return image ? <StudioFigure key={i} image={image} alt={match[1]}/> : <p key={i}>{match[1] || 'Image unavailable'}</p>;
} return block ? <ContentBody key={i} text={block}/> : null; })}</>; }
export function StudioPreview({ snapshot: s, images, kind }: {
    snapshot: StudioSnapshot;
    images: Record<string, StudioImage>;
    kind: StudioKind;
}) { return <article className="public-card studio-preview"><h2>{s.title}</h2><StudioFigure image={s.coverId ? images.cover : undefined} alt={s.coverAlt || `Image for ${s.title}`}/>{kind === 'event' && s.starts_at && <p>{new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' }).format(s.starts_at)} (Toronto time){s.location ? ` · ${s.location}` : ''}</p>}<StudioBody text={s.body_text} images={images}/>{s.items?.filter(i => i.enabled).map(item => <section key={item.id}><StudioFigure image={images[item.id]} alt={item.alt || item.title || s.title} gallery={kind === 'gallery'}/>{item.title && <h3>{item.title}</h3>}{item.description && <p>{item.description}</p>}{item.link && <a className="text-link" href={item.link}>{item.linkText || 'Learn more'}</a>}</section>)}</article>; }
