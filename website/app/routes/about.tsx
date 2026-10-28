import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {CrunchMark} from '../components/community';
import {publicPages} from '../content/public-pages';

export function meta() {
  return [{title: `${publicPages.about.title}.`}, {name: 'description', content: publicPages.about.description}];
}

function MemoryPlaceholder({label, className = ''}: {label: string; className?: string}) {
  return <figure className={`v3-memory-slot ${className}`}>
    <div className="v3-memory-canvas" aria-hidden="true"><span>▧</span><span className="v3-memory-corner">+</span></div>
    <figcaption><strong>{label}</strong><span>Awaiting a real historical image.</span></figcaption>
  </figure>;
}

function SectionTitle({number, id, children}: {number: string; id: string; children: ReactNode}) {
  return <div className="v3-about-section-title"><span className="v3-section-index" aria-hidden="true">{number} /</span><h2 id={id}>{children}</h2></div>;
}

function Paragraphs({items}: {items: readonly string[]}) {
  return <div className="v3-about-copy">{items.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>;
}

export default function Page() {
  const page = publicPages.about;
  const [history, welcome, founder] = page.sections;
  const historyParagraphs = history.text.split('\n\n');
  const welcomeParagraphs = welcome.text.split('\n\n');
  const founderParagraphs = founder.text.split('\n\n');
  return <div className="v3-container v3-page v3-about">
    <header className="v3-about-opening">
      <div className="v3-about-opening-copy">
        <p className="v3-page-eyebrow">{page.eyebrow}</p>
        <h1>About <span className="v3-page-accent">CarrottCrunch.</span></h1>
        <p className="v3-about-lead">Good games bring us together. <strong>Great people make us stay.</strong></p>
        <p className="v3-about-introduction">{page.description}</p>
      </div>
      <div className="v3-about-scrapbook">
        <span className="v3-about-spark" aria-hidden="true">✳</span>
        <MemoryPlaceholder label="Community memories" className="v3-memory-slot--opening"/>
        <p className="v3-memory-caption">Room for real memories.</p>
      </div>
    </header>

    <section className="v3-about-history" id="about-history" aria-labelledby="about-section-0">
      <SectionTitle number="01" id="about-section-0">{history.title}</SectionTitle>
      <p className="v3-about-chapter-note">Some names from our story, not a complete timeline.</p>
      <ul className="v3-about-chapters" aria-label="Names from our community's history">
        {["The Boop's Discord", 'CarrottCrazeHQ', 'The Rooted Realm', 'CarrottCrunch'].map((name, index) => <li key={name} className={index === 3 ? 'v3-about-current-chapter' : undefined}>
          {index === 3 && <CrunchMark/>}<span>{name}</span>
        </li>)}
      </ul>
      <div className="v3-about-history-grid">
        <div><p className="v3-about-history-lead">{historyParagraphs[0]}</p><Paragraphs items={historyParagraphs.slice(1, 3)}/></div>
        <div className="v3-about-history-later"><Paragraphs items={historyParagraphs.slice(3, -1)}/><p className="v3-about-history-ending">{historyParagraphs.at(-1)}</p>
          <MemoryPlaceholder label="Shared worlds &amp; moments" className="v3-memory-slot--history"/>
        </div>
      </div>
    </section>

    <section className="v3-about-welcome" id="about-welcome" aria-labelledby="about-section-1">
      <SectionTitle number="02" id="about-section-1">{welcome.title}</SectionTitle>
      <div className="v3-about-welcome-grid">
        <div className="v3-about-welcome-note"><span aria-hidden="true">✳</span><Paragraphs items={welcomeParagraphs.slice(0, 2)}/></div>
        <Paragraphs items={welcomeParagraphs.slice(2, -1)}/>
      </div>
      <p className="v3-about-welcome-ending"><strong>{welcomeParagraphs.at(-1)}</strong></p>
    </section>

    <section className="v3-about-founder v3-cocoa" id="about-founder" aria-labelledby="about-section-2">
      <SectionTitle number="03" id="about-section-2">{founder.title}</SectionTitle>
      <div className="v3-founder-layout">
        <aside className="v3-founder-profile" aria-label="TheCarrottCake, known as Carrott">
          <div className="v3-founder-avatar"><img src="/branding/TCC_Logo_Icon_Only.svg" width="648" height="350" alt="TheCarrottCake personal TCC logo" loading="lazy" decoding="async"/></div>
          <p className="v3-founder-name">Carrott</p><p className="v3-founder-handle">TheCarrottCake</p>
        </aside>
        <div className="v3-founder-message">
          <h3 className="v3-founder-title">Hey! I'm Carrott!</h3>
          <p className="v3-founder-byline">TheCarrottCake · Founder of CarrottCrunch</p>
          <Paragraphs items={founderParagraphs.slice(0, -2)}/>
          <div className="v3-founder-signoff"><p><strong>{founderParagraphs.at(-2)}</strong></p><p>{founderParagraphs.at(-1)}</p></div>
        </div>
      </div>
    </section>

    <div className="v3-about-farewell"><CrunchMark/>
      <p className="v3-about-closing">Good games. Great people.<br/><span>A little extra crunch.</span></p>
      <div className="v3-page-actions">
        <Link className="button primary" to="/join">Join Discord <span aria-hidden="true">↗</span></Link>
        <Link className="button secondary" to="/servers">Explore servers</Link>
      </div>
    </div>
  </div>;
}
