import {Link} from 'react-router';
import type {CommunityGame} from '../content/games';

/** Ordinary site typography and original CSS geometry, never publisher branding. */
export function GameCard({game, compact=false}: {game: CommunityGame; compact?: boolean}) {
  const titleId=`${compact ? 'preview' : 'game'}-${game.id}`;
  return <article className={`v3-game-card v3-game-card--${game.theme}${compact ? ' v3-game-card--compact' : ''}`} aria-labelledby={titleId}>
    <div className="v3-game-face">
      <div className="v3-game-motif" aria-hidden="true"><span/><span/><span/></div>
      <h3 id={titleId}>{game.title}</h3>
    </div>
    <div className="v3-game-copy">
      <ul className="v3-game-genres" aria-label={`${game.title} genres`}>{game.genres.map(genre=><li key={genre}>{genre}</li>)}</ul>
      {!compact && <p>{game.description}</p>}
      {game.hostedServer && <Link className="v3-game-server-link" to={game.hostedServer.href}>{compact ? 'Our hosted Create server' : game.hostedServer.label} <span aria-hidden="true">&#8599;</span></Link>}
    </div>
  </article>;
}
