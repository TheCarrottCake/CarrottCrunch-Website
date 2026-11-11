import {useState} from 'react';
import {Link} from 'react-router';
import {isServerImage, type PublicServer, type ServerImage} from '../content/servers';

/** Shared figure keeps illustration labels and mandatory credit outside the crop. */
export function ServerArtwork({image, eager = false}: {image?: ServerImage; eager?: boolean}) {
  const [failed, setFailed] = useState(false);
  return <figure className="v3-server-artwork">
    <div className="v3-server-artwork-frame">
      {isServerImage(image) && !failed
        ? <img src={image.src} alt={image.alt} width={1600} height={900} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}/>
        : <div className="v3-server-artwork-empty"><span aria-hidden="true">&#9881;</span><p>A little room for a big world.</p><p>Server imagery is not available here yet.</p></div>}
    </div>
    <figcaption>{isServerImage(image) && !failed ? <>{image.caption}{image.requiredCredit && <span className="v3-server-required-credit">{image.requiredCredit}</span>}</> : 'No server screenshot is being displayed.'}</figcaption>
  </figure>;
}

export function ServerCard({server}: {server: PublicServer}) {
  return <article className={`v3-server-card${server.featured ? ' v3-server-card--featured' : ''}`} aria-labelledby={`v3-server-${server.id}`}>
    <ServerArtwork image={server.image} eager={server.featured}/>
    <div className="v3-server-card-copy">
      <p className="v3-server-kicker">{server.featured ? 'Featured world' : 'Community world'} <span aria-hidden="true">/</span> {server.game}</p>
      <h2 id={`v3-server-${server.id}`}>{server.name}</h2>
      <p>{server.description}</p>
      <p className="v3-server-card-context">{server.game} &middot; A CarrottCrunch community server</p>
      <p className="v3-server-access-label">{server.availability === 'private-access' ? 'Private access - ask in Discord' : 'Explore the server details'}</p>
      <div className="v3-page-actions">
        <Link className="button primary" to={server.detailsHref}>Explore Server <span aria-hidden="true">&#8599;</span></Link>
        <Link className="v3-server-text-link" to="/join">Join Discord</Link>
      </div>
    </div>
  </article>;
}
