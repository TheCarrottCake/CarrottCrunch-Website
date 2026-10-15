import { useEffect, useRef, useState } from 'react';
import { Form, Link } from 'react-router';
import type { AccountView } from '../lib/account-view';

export function AccountMenu({ account, onNavigate }: { account: AccountView; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);
  useEffect(() => { setImageFailed(false); }, [account.avatarUrl]);
  const close = () => { setOpen(false); onNavigate(); };
  return <div className="account-menu" ref={root} onBlurCapture={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); toggle.current?.focus(); }
  }}>
    <button type="button" ref={toggle} className="account-toggle" aria-expanded={open} aria-controls="site-account-menu" aria-label={`Account menu for ${account.displayName}`} onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); if (open) first.current?.focus(); else setOpen(true); }
    }}>
      {account.avatarUrl && !imageFailed ? <img className="account-avatar" src={account.avatarUrl} width="32" height="32" alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <span className="account-avatar account-avatar-fallback" aria-hidden="true">{account.displayName.slice(0, 1).toUpperCase()}</span>}
      <span className="account-toggle-label">My Account</span><span aria-hidden="true">⌄</span>
    </button>
    <ul id="site-account-menu" className="account-menu-panel" hidden={!open}>
      <li><Link ref={first} to="/account" onClick={close}>My Account</Link></li>
      {account.canAccessControl && <li><Link to="/control" onClick={close}>Crunch Control</Link></li>}
      <li><Form method="post" action="/logout" reloadDocument><input type="hidden" name="_csrf" value={account.csrf} /><button type="submit">Sign Out</button></Form></li>
    </ul>
  </div>;
}
