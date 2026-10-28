import { useRef, useState, type ReactNode } from 'react';
import { Form, Link, NavLink } from 'react-router';
import { Brand } from './community';
import { dashboardTools } from '../lib/dashboard-tools';
import type { StaffRole } from '../lib/staff-auth.server';

export type ControlDashboardProps = {
  identity: { username: string; displayName: string };
  role: StaffRole;
  csrf: string;
  children?: ReactNode;
  section: 'Overview' | 'Media Library' | 'News & Events' | 'Posts & Events' | 'Homepage' | 'Community Gallery' | 'About Memories';
  counts?: {pending:number|null;overdue:number|null}|null;
};

export function ControlDashboard({ identity, role, csrf, children, section, counts }: ControlDashboardProps) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const tools = dashboardTools(role);
  const isOverview = section === 'Overview';
  return <>
    <a className="skip-link" href="#control-main">Skip to content</a>
    <div className="container dashboard-layout">
      <aside className="dashboard-sidebar" aria-label="Crunch Control navigation" onKeyDown={event => {
        if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); }
      }}>
        <Brand />
        <div className="dashboard-nav-heading"><span className="eyebrow orange">CRUNCH CONTROL</span>
          <button className="dashboard-menu-toggle" ref={toggle} aria-expanded={open} aria-controls="control-nav" onClick={() => setOpen(value => !value)}>{open ? 'Close ✕' : 'Tools ☰'}</button>
        </div>
        <nav id="control-nav" aria-label="Staff tools" className={`dashboard-nav${open ? ' is-open' : ''}`}>
          <NavLink to="/control" end onClick={() => setOpen(false)}>Overview</NavLink>
          {tools.map(tool => tool.href ? <NavLink key={tool.id} to={tool.href} onClick={() => setOpen(false)}>{tool.name}</NavLink> : <span key={tool.id} className="dashboard-nav-unavailable" aria-disabled="true"><span>{tool.name}</span><small>Unavailable</small></span>)}
        </nav>
        <div className="dashboard-sidebar-actions">
          <Link className="text-link" to="/account">My Account</Link>
          <Link className="text-link" to="/">← Public website</Link>
          <Form method="post" action="/control/logout" reloadDocument>
            <input type="hidden" name="_csrf" value={csrf} />
            <button className="button secondary">Sign Out</button>
          </Form>
        </div>
      </aside>
      <main id="control-main" className="dashboard-main" tabIndex={-1}>
        {isOverview ? <header className="dashboard-welcome">
          <div className="eyebrow orange">STAFF WORKSPACE / OVERVIEW</div>
          <h1>Welcome, <span>{identity.displayName}</span>.</h1>
          <p className="dashboard-account"><span>{identity.username}</span><span className="dashboard-role">{role}</span></p>
          <p>Your place to help shape CarrottCrunch. Staff tools will appear here as they become available.</p>
        </header> : <header className="dashboard-section-header">
          <div className="eyebrow orange">STAFF WORKSPACE / {section}</div>
        </header>}
        {children || (isOverview && <><section className="dashboard-notice" aria-labelledby="dashboard-status-title">
          <h2 id="dashboard-status-title">A little patience. Something good is growing.</h2>
          <p>Create posts, events, homepage slides and Community Creations with one shared Media Library.</p>

        </section>
        <section aria-labelledby="dashboard-tools-title" className="dashboard-tools">
          <div className="dashboard-section-heading"><h2 id="dashboard-tools-title">Your tools</h2><span className="muted">Available navigation reflects your staff role.</span></div>
          <div className="dashboard-tool-grid">{tools.map(tool => <article className="public-card" key={tool.id}>
            <span className="micro orange">{tool.href ? 'AVAILABLE · STAFF TOOL' : 'UNAVAILABLE · FUTURE TOOL'}</span>
            <h3>{tool.href ? <Link to={tool.href}>{tool.name}</Link> : tool.name}</h3><p>{tool.description}</p>
          </article>)}</div>
        </section></>)}
      </main>
    </div>
  </>;
}
