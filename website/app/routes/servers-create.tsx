import {Link} from 'react-router';
import {ServerArtwork} from '../components/server-card';
import {publicServers} from '../content/servers';
import '../servers.css';

export function meta() {
  return [{title: "Carrott's Create Server - CarrottCrunch"}, {name: 'description', content: 'Creative Minecraft engineering with CarrottCrunch. Learn about the Create server and its private-access onboarding.'}];
}
const activities = [
  ['01', 'Make it move.', 'Create contraptions and mechanical automation turn building ideas into engineering experiments. A few gears can go a long way.'],
  ['02', 'Think beyond the workshop.', 'Trains and railway projects are another way to dream up connections between builds. Bring your ideas and talk them through with other players.'],
  ['03', 'Build something together.', 'Collaborative building, exploration and community projects are at the heart of a shared world. Leave room for someone else to add their own spark.'],
] as const;
const steps = [
  ['Find the community', <>Join CarrottCrunch through the <Link to="/join">official Discord invitation</Link>.</>],
  ['Ask for server access', <>Request access to the Minecraft server. Discord membership does not automatically grant access.</>],
  ['Follow private onboarding', <>Authorized staff will guide you through private Tailscale access and Minecraft whitelisting. Connection details stay in that private onboarding.</>],
  ['Get the right modpack', <>Install the required modpack and any confirmed required components using the instructions provided by staff.</>],
] as const;

export default function CreateServer() {
  const server = publicServers().find(entry => entry.slug === 'create');
  if (!server) return <div className="v3-container v3-page servers-page"><h1>Server information unavailable</h1><Link className="v3-server-text-link" to="/servers">Back to all servers</Link></div>;
  return <div className="v3-container v3-page servers-page create-v3-server-page">
    <nav className="v3-server-breadcrumb" aria-label="Server navigation"><Link to="/servers"><span aria-hidden="true">&#8592;</span> All servers</Link><span aria-hidden="true">/</span><span aria-current="page">Create</span></nav>
    <header className="v3-server-detail-opening">
      <div><p className="v3-server-kicker">Minecraft Java &middot; Modded &middot; Private access</p>
        <h1>Carrott's<br/><span className="v3-page-accent">Create Server.</span></h1>
        <p className="v3-server-detail-lead">Big ideas. Turning gears.<br/>Better with friends.</p>
        <p>A shared Minecraft world with a love for creative engineering. From a small contraption to a project you can build together, this is a place to put your imagination to work.</p>
        <div className="v3-page-actions"><a className="button primary" href="#getting-started">How to join <span aria-hidden="true">&#8595;</span></a><Link className="v3-server-text-link" to="/join">Join Discord</Link></div>
      </div><ServerArtwork image={server.image} eager/>
    </header>
    <section className="v3-server-activities" aria-labelledby="create-activities">
      <div className="v3-server-section-heading"><p className="v3-server-kicker">A little mechanical imagination</p><h2 id="create-activities">What will you set in motion?</h2><p>From a first contraption to an ambitious railway idea, there is plenty to imagine together.</p></div>
      <div className="v3-server-activity-grid">{activities.map(([number,title,description]) => <article key={number}><span className="v3-section-index" aria-hidden="true">{number} /</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>
    <section className="v3-server-onboarding" id="getting-started" aria-labelledby="create-getting-started">
      <div className="v3-server-onboarding-intro"><span className="v3-server-cog" aria-hidden="true">&#9881;</span><p className="v3-server-kicker">Your way into the workshop</p><h2 id="create-getting-started">A few steps.<br/>Then, let's build.</h2><p>The server uses private Tailscale access and a Minecraft whitelist. Ask authorized staff for access and the current setup instructions.</p><Link className="button primary" to="/join">Start on Discord <span aria-hidden="true">&#8599;</span></Link></div>
      <ol className="v3-server-steps">{steps.map(([title,description],index) => <li key={title}><span aria-hidden="true">0{index+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
    </section>
    <section className="v3-server-practical" aria-label="Requirements and community expectations">
      <article className="v3-server-requirements"><p className="v3-server-kicker">Before you jump in</p><h2>Bring the right tools.</h2><dl><div><dt>Edition</dt><dd>Minecraft Java Edition</dd></div><div><dt>Gameplay</dt><dd>Modded Minecraft with Create</dd></div><div><dt>Access</dt><dd>Private Tailscale access and Minecraft whitelist onboarding</dd></div><div><dt>Exact modpack &amp; versions</dt><dd>Not published here yet. Confirm the current modpack, game version and required components with authorized staff before installing.</dd></div></dl></article>
      <article className="v3-server-expectations"><p className="v3-server-kicker">Good neighbours. Great builds.</p><h2>Leave a little room for others.</h2><ul><li>Treat other players with respect.</li><li>No griefing: respect other people's builds.</li><li>Avoid lag-heavy builds and be considerate with automation.</li><li>Keep shared spaces and other players in mind.</li></ul><Link className="v3-server-text-link" to="/safety">Read our safety guidance <span aria-hidden="true">&#8594;</span></Link></article>
    </section>
    <section className="v3-server-moments" aria-labelledby="create-moments"><div><p className="v3-server-kicker">Server moments</p><h2 id="create-moments">The best part?<br/>What we make together.</h2><p>Real, authorized Create Server screenshots have not been added here yet. Until then, this space is saved for the things we build and the stories behind them.</p><Link className="v3-server-text-link" to="/gallery">Explore the community gallery <span aria-hidden="true">&#8594;</span></Link></div><div className="v3-server-moments-placeholder"><span aria-hidden="true">&#9881;</span><p>Future memories go here.</p><span>No server screenshot published yet.</span></div></section>
    <div className="v3-page-actions v3-server-closing"><Link className="button primary" to="/join">Join Discord <span aria-hidden="true">&#8599;</span></Link><Link className="button secondary" to="/servers">Back to all servers</Link></div>
  </div>;
}
