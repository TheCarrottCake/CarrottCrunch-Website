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

/** Image-free editorial introduction; only the page owns its H1. */
export function EditorialHeader({title, accent, eyebrow, description, children}: {
  title: ReactNode; accent?: string; eyebrow?: string; description?: ReactNode; children?: ReactNode;
}) {
  return <header className="v3-page-header">
    {eyebrow && <p className="v3-page-eyebrow">{eyebrow}</p>}
    <h1>{title}{accent && <span className="v3-page-accent">{accent}</span>}</h1>
    {description && <p className="v3-page-description">{description}</p>}
    {children && <div className="v3-page-context">{children}</div>}
  </header>;
}

/** Presentation accepts plain content so a future content source can supply it. */
export function PublicPage({ content, children }: { content: PublicPageContent; children?: ReactNode }) {
  return <div className={`v3-container v3-page v3-information v3-information--${content.title.toLowerCase()}`}>
    <EditorialHeader title={content.title} accent="." eyebrow={content.eyebrow} description={content.description}/>
    <div className="v3-editorial-sections">
      {content.sections.map((section, index) => <article className={`v3-editorial-section${content.title === 'Servers' && index === 0 ? ' v3-cocoa' : ''}`} key={section.title}>
        <span className="v3-section-index" aria-hidden="true">{String(index + 1).padStart(2, '0')} /</span>
        <div>
        {section.placeholder && <p className="v3-editorial-notice">CONTENT NOT YET PUBLISHED</p>}
        {content.title === 'About' && section.title === 'Brand artwork' && <p className="v3-editorial-notice">LEGACY WORDING · NEEDS EDITORIAL REVIEW</p>}
        <h2>{section.title}</h2><p>{section.text}</p>
        {content.title === 'About' && section.title === 'Brand artwork' && <p className="v3-editorial-note">This legacy description predates the current official CarrottCrunch brand artwork.</p>}
        </div>
      </article>)}
    </div>
    {children}
    <div className="v3-page-actions">
      <Link className="button primary" to="/join">Join Discord <span aria-hidden="true">↗</span></Link>
      <Link className="button secondary" to="/">Back to home</Link>
    </div>
  </div>;
}
