import {Link} from 'react-router';
import {EditorialHeader} from '../components/public-page';
import {ServerCard} from '../components/server-card';
import {publicServers} from '../content/servers';
import '../servers.css';

export function meta() {
  return [{title: 'Servers - CarrottCrunch'}, {name: 'description', content: "Different worlds. One community. Explore CarrottCrunch's gaming servers and find out how to request access."}];
}
export default function Servers() {
  const servers = publicServers();
  return <div className="v3-container v3-page servers-page">
    <div className="v3-server-hub-opening"><EditorialHeader eyebrow="Our shared worlds" title={<>Different worlds.<br/><span className="v3-page-accent">One community.</span></>}
      description="From complicated contraptions to adventures with friends, there's always something new to build, explore, or accidentally break."/>
      <aside className="v3-server-play-note" aria-label="Gaming together"><div className="v3-server-controller" aria-hidden="true"><span className="v3-server-dpad"/><span className="v3-server-controller-buttons"/></div><p>Build. Explore. Play.</p><span>Always better with company.</span></aside>
    </div>
    <div className="v3-server-catalog" aria-label="Community servers">
      {servers.map(server => <ServerCard key={server.id} server={server}/>)}
      {!servers.length && <p className="v3-server-empty">No servers are published here yet. You can still find the community on Discord.</p>}
    </div>
    <section className="v3-server-hub-note" aria-labelledby="hub-note-title">
      <span className="v3-server-cog" aria-hidden="true">&#9881;</span>
      <div><p className="v3-server-kicker">The games change. The company stays.</p><h2 id="hub-note-title">Find your next shared adventure.</h2>
      <p>CarrottCrunch is about the people across our games. Come for a build, stay for a conversation, or find someone to play with.</p><ul className="v3-server-community-ways" aria-label="Ways to spend time together"><li>Build together</li><li>Find your party</li><li>Just hang out</li></ul></div>
      <Link className="button secondary" to="/join">Meet us on Discord <span aria-hidden="true">&#8599;</span></Link>
    </section>
    <p className="v3-server-beyond"><span>Beyond the Servers</span> <Link to="/games" className="v3-server-text-link">See what we're playing <span aria-hidden="true">&#8594;</span></Link></p>
  </div>;
}
