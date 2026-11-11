import {Link} from 'react-router';
import {EditorialHeader} from '../components/public-page';
import {GameCard} from '../components/game-card';
import {communityGames} from '../content/games';
import '../games.css';

export function meta() {return [{title:'Games - CarrottCrunch'},{name:'description',content:'Different games. Same chaos. Explore six games played by the CarrottCrunch Discord community.'}];}
export default function Games() {
  return <div className="v3-container v3-page v3-games-page">
    <EditorialHeader eyebrow="What we're playing" title={<>Different games.<br/><span className="v3-page-accent">Same chaos.</span></>}
      description="From one more block to one more round, these are some of the games we play together. Find your kind of adventure, then find your people on Discord."/>
    <section aria-labelledby="games-directory-title"><div className="v3-games-directory-heading"><h2 id="games-directory-title">Find your next shared game.</h2><p>Community games, not a list of hosted servers. Minecraft has our hosted Create server; the other games here are community play.</p></div>
      <div className="v3-games-grid">{communityGames.map(game=><GameCard key={game.id} game={game}/>)}</div>
    </section>
    <div className="v3-games-closing"><p>Good company travels between games.</p><Link className="button primary" to="/join">Find us on Discord <span aria-hidden="true">&#8599;</span></Link><Link className="v3-games-link" to="/servers">Explore hosted servers</Link></div>
  </div>;
}
