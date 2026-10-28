import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Brand } from './community';
import {EditorialHeader} from './public-page';
import '../public-v3.css';
export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="public-v3"><a className="skip-link" href="#account-main">Skip to content</a><div className="v3-container v3-standalone-brand"><Brand /></div>
    <main id="account-main" className="v3-container v3-page v3-account-entry" tabIndex={-1}><EditorialHeader eyebrow="CARROTTCRUNCH ACCOUNT" title={title}/><div className="v3-entry-content">{children}<Link to="/" className="text-link">← Public website</Link></div></main></div>;
}
