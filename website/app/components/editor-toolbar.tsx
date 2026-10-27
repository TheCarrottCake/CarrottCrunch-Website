import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useFetcher } from 'react-router';
import type { StaffRole } from '../lib/staff-auth.server';
import type { Workflow, WorkflowIntent } from '../lib/publication-workflow.server';
import { PublicationTime } from './publication-time';
import { DeleteDraftButton } from './delete-draft-button';

export type EditorToolbarContext = {
  workflow?: Workflow;
  role?: StaffRole;
  released?: boolean;
  history?: ReactNode;
  headingId?: string;
  returnToEditor?: boolean;
};
type ToolbarProps = EditorToolbarContext & {
  title: string;
  kind: 'announcement' | 'event';
  csrf: string;
  formId?: string;
  dirty?: boolean;
  conflict?: boolean;
  busy?: boolean;
};
const labels: Record<string, string> = {
  draft: 'Draft', review: 'Pending review', approved: 'Approved', scheduled: 'Scheduled',
  published: 'Published', archived: 'Archived', submit: 'Submit for Review',
  'approve-publish': 'Approve & Publish', 'approve-schedule': 'Schedule Publish',
  approve: 'Approve Only', reject: 'Reject', unpublish: 'Unpublish', archive: 'Archive',
  'cancel-schedule': 'Cancel schedule', history: 'History',
};
function ActionIcon({ action }: { action: string }) {
  const paths: Record<string, string> = {
    save: 'M4 3h13l4 4v14H3V3h1M7 3v6h10V3M7 21v-8h10v8',
    submit: 'm3 11 18-8-8 18-2-8-8-2Zm8 2L21 3',
    'approve-publish': 'm4 12 5 5L20 6',
    'approve-schedule': 'M8 2v4m8-4v4M3 10h18M3 4h18v18H3V4m5 11h3m3 0h3',
    more: 'm6 9 6 6 6-6',
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[action] || paths.more} /></svg>;
}

/** One toolbar for both editors and the saved-revision review screen. */
export function EditorToolbar({ title, kind, csrf, workflow: w, role = 'Moderator', released = false,
  formId, dirty = false, conflict = false, busy = false, history, headingId = 'editor-heading', returnToEditor = true }: ToolbarProps) {
  const admin = role === 'Administrator' || role === 'Owner';
  const fetcher = useFetcher<{ message?: string; status?: number }>();
  const [active, setActive] = useState<WorkflowIntent | 'history' | null>(null);
  const [locked, setLocked] = useState(false);
  const [attempted, setAttempted] = useState<WorkflowIntent | 'history' | null>(null);
  const submitted = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const more = useRef<HTMLDetailsElement>(null);
  const dialogId = useId();
  const pending = locked || fetcher.state !== 'idle';
  const stale = conflict || fetcher.data?.status === 409;
  const disabled = busy || pending || stale || dirty;
  const editableStatus = !!w && ['draft', 'review', 'approved'].includes(w.status);

  useEffect(() => {
    if (active && !dialog.current?.open) {
      dialog.current?.showModal();
      if (active === 'approve-schedule') dialog.current?.querySelector<HTMLInputElement>('input[type=date]')?.focus();
      else if (active === 'history') dialog.current?.querySelector<HTMLElement>('h2')?.focus();
      else cancel.current?.focus();
    }
  }, [active]);
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      submitted.current = false; setLocked(false);
      if (dialog.current?.open) feedback.current?.focus();
    }
  }, [fetcher.state, fetcher.data]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!dialog.current?.open && event.target instanceof Node && !more.current?.contains(event.target)) more.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  const open = (intent: WorkflowIntent | 'history', button: HTMLElement) => {
    returnFocus.current = more.current?.contains(button) ? more.current.querySelector('summary') : button;
    more.current?.removeAttribute('open');
    setAttempted(null);
    setActive(intent);
  };
  const actionButton = (intent: WorkflowIntent, primary = false) => <button type="button"
    className={`button ${primary ? 'primary' : 'secondary'}`} disabled={disabled} aria-haspopup="dialog"
    onClick={event => open(intent, event.currentTarget)}><ActionIcon action={intent} />{labels[intent]}</button>;
  const destructive = active === 'archive' || active === 'unpublish';
  const description = active === 'approve-publish'
    ? `Publish saved revision ${w?.editorial_revision} publicly now. Required submission and explicit approval are recorded.`
    : active === 'approve-schedule'
      ? `Approve revision ${w?.editorial_revision} if needed and schedule its public release.`
      : active === 'archive'
        ? 'Remove public visibility, close the working item and cancel pending schedules. Saved content and history are retained.'
        : active === 'unpublish'
          ? 'Remove public visibility and cancel pending schedules. Content remains available for editing.'
          : active === 'approve'
            ? `Explicitly approve revision ${w?.editorial_revision}. This does not publish it. You may approve your own submission.`
            : active === 'reject' ? 'Return this submission for revision.'
              : active === 'submit' ? `Submit saved revision ${w?.editorial_revision} for review.`
                : 'Cancel the pending release. The unchanged revision remains approved.';

  return <header className="editor-toolbar" aria-label={`${kind === 'event' ? 'Event' : 'Announcement'} editor actions`}>
    <div className="editor-toolbar-heading"><h1 id={headingId} title={title}>{title}</h1>
      <p className="editor-toolbar-state" data-workflow-status={w?.status} aria-live="polite">{w ? `${labels[w.status]} · Revision ${w.editorial_revision}` : 'New private draft'}
        {w?.live_release_id ? ' · Live version unchanged by edits' : ''} · {dirty ? 'Unsaved changes' : 'Saved'}{pending || busy ? ' · Working…' : ''}</p>
    </div>
    <div className="editor-toolbar-actions">
      {formId && <button className="button secondary" type="submit" form={formId} aria-label="Save draft" disabled={busy || pending || stale || (!!w && !dirty)}><ActionIcon action="save" />{busy ? 'Saving…' : 'Save'}</button>}
      {w?.status === 'draft' && !admin && actionButton('submit', true)}
      {admin && editableStatus && <>{actionButton('approve-publish', true)}{actionButton('approve-schedule')}</>}
      <details className="editor-more" ref={more} onKeyDown={event => {
        if (event.key === 'Escape' && !dialog.current?.open && !event.currentTarget.querySelector('dialog[open]')) { event.preventDefault(); more.current?.removeAttribute('open'); more.current?.querySelector('summary')?.focus(); }
      }}><summary className="button secondary">More <ActionIcon action="more" /></summary>
        <div className="editor-more-panel" aria-label="More editor actions">
          {admin && w?.status === 'draft' && actionButton('submit')}
          {admin && w?.status === 'review' && <>{actionButton('approve')}{actionButton('reject')}</>}
          {admin && w?.status === 'scheduled' && actionButton('cancel-schedule')}
          {admin && w?.live_release_id && actionButton('unpublish')}
          {admin && w && w.status !== 'archived' && actionButton('archive')}
          {w?.status === 'draft' && !released && !w.live_release_id && <DeleteDraftButton id={w.content_id} kind={kind} revision={w.editorial_revision} title={title} csrf={csrf} showLabel disabled={busy || pending || stale} />}
          {history && <button type="button" className="button secondary" onClick={event => open('history', event.currentTarget)}>History</button>}
          {!returnToEditor && w && w.status !== 'archived' && <Link className="button secondary" to={`/control/${kind === 'event' ? 'events' : 'news'}/${w.content_id}`}>Edit working copy</Link>}
          <Link className="button secondary" to={kind === 'event' ? '/control/news?kind=event' : '/control/news'}>All {kind === 'event' ? 'events' : 'announcements'}</Link>
        </div>
      </details>
    </div>
    {dirty && w && <p className="editor-toolbar-hint">Save your changes before submitting or publishing.</p>}
    {stale && <p className="studio-field-error" role="alert">This revision changed. Your edits are preserved; compare with the latest saved copy before reloading.</p>}
    {active && <dialog className="draft-delete-dialog editor-action-dialog" ref={dialog} aria-labelledby={dialogId} aria-describedby={`${dialogId}-description`}
      onCancel={event => { if (pending) event.preventDefault(); }}
      onClose={() => { setActive(null); returnFocus.current?.focus(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]'));
        const first = controls[0], last = controls.at(-1), focused = event.currentTarget.ownerDocument.activeElement;
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (focused === first || !controls.includes(focused as HTMLElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (focused === last || !controls.includes(focused as HTMLElement))) { event.preventDefault(); first.focus(); }
      }}>
      <h2 id={dialogId} tabIndex={active === 'history' ? -1 : undefined}>{labels[active]}{active === 'history' ? '' : '?'}</h2>
      <p className="draft-delete-title">{title}</p>
      <p id={`${dialogId}-description`}>{active === 'history' ? 'Saved revisions and recorded workflow actions.' : description}</p>
      {active === 'history' ? <>{history}<button className="button secondary" ref={cancel} onClick={() => dialog.current?.close()}>Close</button></> : w && <fetcher.Form method="post" action={`/control/workflow/${w.content_id}`} className="studio-form" onSubmit={event => {
        if (submitted.current || disabled) { event.preventDefault(); return; }
        submitted.current = true; setLocked(true); setAttempted(active);
      }}>
        <input type="hidden" name="_csrf" value={csrf} /><input type="hidden" name="intent" value={active} />
        <input type="hidden" name="revision" value={w.editorial_revision} /><input type="hidden" name="version" value={w.version} />
        {returnToEditor && <input type="hidden" name="returnTo" value="editor" />}
        {active === 'approve-schedule' && <PublicationTime />}
        {active === 'reject' && <><label htmlFor={`${dialogId}-explanation`}>Explanation (optional)</label><textarea id={`${dialogId}-explanation`} name="explanation" maxLength={2000} /></>}
        {fetcher.data?.message && attempted === active && <p className="studio-message" role="alert" ref={feedback} tabIndex={-1}>{fetcher.data.message}</p>}
        <div className="studio-actions"><button type="button" ref={cancel} className="button secondary" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button>
          <button className={`button ${destructive ? 'draft-delete-confirm' : 'primary'}`} disabled={disabled}>{pending ? 'Working…' : labels[active]}</button></div>
      </fetcher.Form>}
    </dialog>}
  </header>;
}
