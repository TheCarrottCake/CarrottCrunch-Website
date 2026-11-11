import {Link} from 'react-router';
import {safetyPolicy} from '../content/safety';
import '../safety.css';

export function meta() {
  return [{title: 'Community Safety - CarrottCrunch'}, {name: 'description', content: 'Good games. Good neighbours. Community rules, Minecraft expectations and private Discord reporting guidance for CarrottCrunch.'}];
}
const sections = [['community-rules', 'The ground rules'], ['minecraft', 'Minecraft'], ['reporting', 'Reporting & accountability']] as const;
const ruleGroups = [
  {title: 'Respect & Behaviour', paragraphs: [...safetyPolicy.rules[1].paragraphs, ...safetyPolicy.rules[2].paragraphs]},
  {title: 'Play Fair', paragraphs: [...safetyPolicy.rules[3].paragraphs, ...safetyPolicy.rules[4].paragraphs]},
  {title: 'Keep Chats Enjoyable', paragraphs: safetyPolicy.rules[6].paragraphs},
  {title: 'Privacy & Account Safety', paragraphs: [...safetyPolicy.rules[5].paragraphs, 'When reporting a concern, avoid sharing sensitive personal information.']},
];
function SectionTitle({number, title, id}: {number: string; title: string; id: string}) {
  return <div className="v3-safety-section-heading"><span aria-hidden="true">{number} /</span><h2 id={id}>{title}</h2></div>;
}
export default function Safety() {
  return <div className="v3-container v3-page v3-safety">
    <header className="v3-safety-hero">
      <p className="v3-page-eyebrow">Community Safety</p>
      <h1>Good games.<br/><span>Good neighbours.</span></h1>
      <p className="v3-safety-intro">{safetyPolicy.intro}</p>
      <p className="v3-safety-age">{safetyPolicy.rules[0].paragraphs[0]}</p>
    </header>
    <nav className="v3-safety-nav" aria-label="On this Safety page">{sections.map(([id,label],index)=><a key={id} href={`#${id}`}><span aria-hidden="true">0{index+1}</span>{label}<span aria-hidden="true">&#8599;</span></a>)}</nav>
    <section id="community-rules" className="v3-safety-section" aria-labelledby="community-rules-title">
      <SectionTitle id="community-rules-title" number="01" title="The Ground Rules"/>
      <div className="v3-safety-rules">{ruleGroups.map((group,index)=><article key={group.title} className="v3-safety-rule"><h3><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{group.title}</h3><div className="v3-safety-rule-copy">{group.paragraphs.map(text=><p key={text}>{text}</p>)}</div></article>)}</div>
    </section>
    <section id="minecraft" className="v3-safety-section v3-safety-minecraft" aria-labelledby="minecraft-title">
      <SectionTitle id="minecraft-title" number="02" title="Minecraft Server Expectations"/>
      <div><p className="v3-safety-server-label">Carrott's Create Server</p><ul>{safetyPolicy.minecraft.map(text=><li key={text}>{text}</li>)}</ul><Link className="v3-safety-link" to="/servers/create">Explore the Create server <span aria-hidden="true">&#8599;</span></Link></div>
    </section>
    <section id="reporting" className="v3-safety-section v3-safety-final" aria-labelledby="reporting-title">
      <SectionTitle id="reporting-title" number="03" title="Reporting & Staff Accountability"/>
      <div className="v3-safety-reporting">
        <h3>Reporting concerns</h3>
        <div className="v3-safety-contacts"><div><h4>General community concerns</h4><p>{safetyPolicy.reporting[0]}</p></div><div><h4>Concerns involving staff</h4><p>{safetyPolicy.reporting[1]}</p><p className="v3-safety-private">Contact them privately through Discord.</p></div></div>
        <div className="v3-safety-report-action"><p>{safetyPolicy.reporting[2]}</p><Link className="button primary" to="/join">Join Discord <span aria-hidden="true">&#8599;</span></Link></div>
      </div>
      <div className="v3-safety-accountability">
        <div><h3>Staff discretion</h3>{safetyPolicy.accountability.slice(0,3).map(text=><p key={text}>{text}</p>)}</div>
        <div id="staff-accountability"><h3>{safetyPolicy.accountability[3]}</h3>{safetyPolicy.accountability.slice(4).map(text=><p key={text}>{text}</p>)}</div>
      </div>
      <p className="v3-safety-emergency">For immediate danger, contact your local emergency services.</p>
    </section>
  </div>;
}
