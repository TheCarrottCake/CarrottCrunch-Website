import {Link} from 'react-router';
import {previewGames} from '../content/games';
import {GameCard} from './game-card';

export function GamesPreview() {
  return <section id="games" className="v3-container v3-games-preview" aria-labelledby="playing-title">
    <header className="v3-games-preview-heading"><div><p className="v3-games-kicker"><span className="section-number">03 /</span> Across the community</p><h2 id="playing-title">What We're Playing</h2><p>A few picks from the games we share.</p></div><Link className="v3-games-link" to="/games">Explore All Games <span aria-hidden="true">&#8594;</span></Link></header>
    <div className="v3-games-grid">{previewGames().map(game=><GameCard key={game.id} game={game} compact/>)}</div>
  </section>;
}
