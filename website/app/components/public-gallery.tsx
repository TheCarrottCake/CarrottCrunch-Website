import {useState} from 'react';
import type {StudioImage, StudioSnapshot} from '../lib/studio-model';
import {isPublicHeroImage, type CommunityHeroSlide} from '../lib/community-hero';
import {safeContentHref} from './content-body';
import {StudioBody} from './studio-render';
import {FullImageDialog} from './full-image-dialog';

type TileProps = {image?: StudioImage; title: string; description?: string; alt?: string; featured?: boolean; link?: string; linkText?: string};

function GalleryTile({image, title, description, alt, featured, link, linkText}: TileProps) {
  const [failed, setFailed] = useState(false);
  const available = image && isPublicHeroImage(image.src) ? image : undefined;
  const credit = available ? [available.creator, available.requiredCredit].filter(Boolean).join(' / ') : '';
  const source = available?.source ? safeContentHref(available.source) : null;
  const href = link ? safeContentHref(link) : null;
  const label = title || 'Community creation';
  const viewerImage: CommunityHeroSlide | null = available && !failed ? {
    id: available.assetId, image: available.src, width: available.width, height: available.height,
    title: label, text: description || '', alt: alt || available.alt || label,
    credit, creditSource: available.source, link: '', linkText: '',
  } : null;

  return <article className="v3-gallery-tile" data-featured={!!featured}>
    <figure>
      <div className="v3-gallery-tile-image">
        {available && !failed ? <img src={available.src} alt={alt || available.alt || label} width={available.width} height={available.height}
          loading="lazy" decoding="async" onError={() => setFailed(true)}/> : <div className="v3-gallery-missing"><p>Image unavailable.</p>
            {available && <button type="button" className="button secondary" onClick={() => setFailed(false)}>Retry image<span className="sr-only">: {label}</span></button>}
          </div>}
      </div>
      {credit && <figcaption className="v3-gallery-credit">{credit}{source && <> · <a href={source} rel="noreferrer">Source</a></>}</figcaption>}
    </figure>
    <div className="v3-gallery-tile-copy">
      {featured && <p className="v3-gallery-featured-label">Featured creation</p>}
      <h3>{label}</h3>
      {description && <p>{description}</p>}
      <div className="v3-gallery-tile-actions">
        {viewerImage && <FullImageDialog image={viewerImage} variant="gallery" triggerLabel={`View full image: ${label}`}/>}
        {href && <a className="text-link" href={href}>{linkText || 'Learn more'}<span className="sr-only">: {label}</span></a>}
      </div>
    </div>
  </article>;
}

/** Public presentation of the existing live collection, never a separate manager. */
export function PublicGallery({snapshot, images}: {snapshot: StudioSnapshot; images: Record<string, StudioImage>}) {
  const items = [...(snapshot.items || [])].filter(item => item.enabled).sort((a,b) => Number(b.featured) - Number(a.featured));
  return <section className="v3-gallery-collection" aria-label="Published community gallery">
    <h2>{snapshot.title}</h2>
    {snapshot.body_text && <StudioBody text={snapshot.body_text} images={images}/>}
    <div className="v3-gallery-grid">
      {snapshot.coverId && <GalleryTile key={`cover:${images.cover?.src}`} image={images.cover} title={snapshot.title} alt={snapshot.coverAlt} featured/>}
      {items.map(item => <GalleryTile key={`${item.id}:${images[item.id]?.src || ''}`} image={images[item.id]} title={item.title} description={item.description}
        alt={item.alt} featured={item.featured} link={item.link} linkText={item.linkText}/>)}
    </div>
    {!items.length && !snapshot.coverId && <p className="content-empty" role="status">No community screenshots are published here yet.</p>}
  </section>;
}
