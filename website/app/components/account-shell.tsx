import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Brand } from './community';
export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  return <><a className="skip-link" href="#account-main">Skip to content</a><div className="container control-brand"><Brand /></div>
    <main id="account-main" className="container control-page" tabIndex={-1}><div className="eyebrow orange">CARROTTCRUNCH ACCOUNT</div><h1>{title}</h1>{children}<Link to="/" className="text-link">← Public website</Link></main></>;
}
