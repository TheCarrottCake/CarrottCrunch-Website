import { useEffect, useId, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import type { DraftKind } from '../lib/draft-delete.server';

export function DeleteDraftButton({ id, kind, revision, title, csrf, showLabel = false, disabled = false }: {
  id: string; kind: DraftKind; revision: number; title: string; csrf: string; showLabel?: boolean; disabled?: boolean;
}) {
  const labelId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const submitted = useRef(false);
  const [locked, setLocked] = useState(false);
  const fetcher = useFetcher<{ message: string; status: number }>();
  const pending = locked || fetcher.state !== 'idle';
  const stale = fetcher.data?.status === 409;
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      submitted.current = false; setLocked(false);
      if (dialog.current?.open) feedback.current?.focus();
    }
  }, [fetcher.state, fetcher.data]);
  return <>
    <button type="button" className="draft-delete-trigger" ref={trigger} aria-label={`Delete draft: ${title}`} aria-haspopup="dialog" disabled={disabled}
      onClick={() => { if (!dialog.current?.open) { dialog.current?.showModal(); cancel.current?.focus(); } }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </svg>
      {showLabel && <span>Delete draft</span>}
    </button>
    <dialog className="draft-delete-dialog" ref={dialog} aria-labelledby={labelId} aria-describedby={`${labelId}-description`}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const active = event.currentTarget.ownerDocument.activeElement;
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (active === first || !controls.some(control => control === active))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (active === last || !controls.some(control => control === active))) { event.preventDefault(); first.focus(); }
      }}
      onCancel={event => { if (pending) event.preventDefault(); }} onClose={() => trigger.current?.focus()}>
      <h2 id={labelId}>Delete this draft?</h2>
      <p className="draft-delete-title">{title}</p>
      <p id={`${labelId}-description`}>This draft will be removed from your drafts. Its saved content and edit history are kept for records. You can’t restore it from this workspace. Unsaved changes will be discarded.</p>
      {fetcher.data && <p className="studio-message" role="alert" tabIndex={-1} ref={feedback}>{fetcher.data.message}</p>}
      <fetcher.Form method="post" action={`/control/drafts/${id}/delete`} onSubmit={event => {
        if (submitted.current || stale) { event.preventDefault(); return; }
        submitted.current = true; setLocked(true);
      }}>
        <input type="hidden" name="_csrf" value={csrf} /><input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="revision" value={revision} /><input type="hidden" name="intent" value="delete" />
        <div className="studio-actions">
          <button type="button" className="button secondary" ref={cancel} disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" className="button draft-delete-confirm" disabled={pending || stale}>{pending ? 'Deleting…' : 'Delete draft'}</button>
        </div>
      </fetcher.Form>
    </dialog>
  </>;
}
