import { Link } from "react-router";
import type { ReactNode } from "react";

export type PublicSection = {
  title: string;
  text: string;
  placeholder?: boolean;
};

export type PublicPageContent = {
  title: string;
  description: string;
  eyebrow: string;
  sections: readonly PublicSection[];
};

export function publicMeta(page: PublicPageContent) {
  return [
    { title: `${page.title} — CarrottCrunch` },
    { name: "description", content: page.description },
  ];
}

/** Presentation accepts plain content so a future content source can supply it. */
export function PublicPage({ content, children }: { content: PublicPageContent; children?: ReactNode }) {
  return <div className="container public-page">
    <header className="public-page-intro">
      <div className="eyebrow orange">{content.eyebrow}</div>
      <h1>{content.title}<span>.</span></h1>
      <p>{content.description}</p>
    </header>
    <div className="public-card-grid">
      {content.sections.map(section => <article className="public-card" key={section.title}>
        {section.placeholder && <p className="micro orange">PLACEHOLDER · CONTENT NOT YET PUBLISHED</p>}
        <h2>{section.title}</h2><p>{section.text}</p>
      </article>)}
    </div>
    {children}
    <div className="public-page-actions">
      <Link className="button primary" to="/join">Join Discord <span aria-hidden="true">↗</span></Link>
      <Link className="button secondary" to="/">Back to home</Link>
    </div>
  </div>;
}
