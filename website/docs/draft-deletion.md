# Announcement and event draft deletion

Saved announcement and event editors now have a trash-can button at the upper right. Both News & Events management tabs also provide the same button on each draft card. Unsaved new drafts have no stored record to delete.

The shared native dialog is titled “Delete this draft?” and names the saved draft. It explains that the draft leaves the workspace, saved content/history are retained, and unsaved changes will be discarded. Cancel receives initial focus. Tab/Shift+Tab wrap inside the dialog; Cancel, Escape and programmatic closing never submit. Closing restores focus to the icon. Errors are announced and receive focus. Confirming synchronously locks submission and disables both buttons; Escape is blocked while the confirmed request is pending. Stale confirmations stay disabled until the list/page is reloaded.

## Semantics and safeguards

Deletion is an audited soft-delete using the existing `archived` state. It does not remove the content row, announcement/event details, immutable revisions or audit records. The transaction appends an archived snapshot and a `state_changed` audit entry with `reason: draft_deleted`, acting staff ID, timestamp and new revision. No migration or new dependency was required.

Archived drafts no longer appear in draft searches/lists and cannot be reopened through the editing loaders. Public queries exclude them. **There is no restoration interface or restore endpoint.** Retained data could support a future controlled restoration feature; deletion is not presented as an available undo workflow.

Only non-fixture, unpublished `draft` records with a null publication timestamp are eligible. Published, scheduled, review, archived, previously published and wrong-kind records are protected. A dedicated POST endpoint at `/control/drafts/:draftId/delete` independently requires Moderator-or-higher permissions, exact same-origin validation and the existing session-bound CSRF token. It validates kind, explicit delete intent and a positive safe revision; the payload is bounded to 4 KiB after authorization. Failures return private, sanitized JSON to the dialog without replacing editor content.

The revision/state comparison is repeated inside the atomic D1 batch. Repeated submissions, simultaneous deletion, concurrent saves and intervening state changes cannot create a second deletion or partial history. Stale/state-race requests return HTTP 409. A failed audit/revision insert rolls back the state change too. Success redirects with HTTP 303 to the appropriate draft tab, which announces the deletion with a status message.

## Verification

- Full regression suite: 71 tests passed, including authorized deletion by all three staff roles, unauthorized/member denial, Origin/CSRF failures, cancellation intent rejection, protected states, repeat/stale actions, transaction rollback, save/delete races, retained snapshots/audits, and public isolation.
- Focused dialog tests were rerun after adding explicit keyboard focus wrapping.
- Typecheck, production build and built-route checks passed. Built checks exercise actual deletion actions, destination tabs/success flags, archived-editor denial, repeated requests, retained history and protected published events.
- Browser review uses clearly illustrative React fixtures and a mock action, without deleting real content. It verifies native modal focus, keyboard cancellation, no request on close, one request despite repeated confirmation, stale-error focus, and desktop/mobile bounds. Artifacts are ignored under `.wrangler/deletion-review/`.

## Manual check

1. Open a saved, clearly labeled local test announcement. Open its trash dialog and verify the title/consequence. Cancel, Escape and reopen; the draft and revision must remain unchanged. Tab and Shift+Tab must stay inside the dialog and closing must return focus to the icon.
2. Confirm deletion. Verify return to Announcements, the success message, removal from the list, and editor-not-found on its old URL. Repeat with a saved event and the Events tab, and delete another test draft directly from each management list.
3. Edit/save the draft in another tab before confirming deletion from the stale tab. Expect HTTP 409, an announced error, a disabled stale confirmation and unchanged saved content. Reload the list before another attempt.
4. Check signed-out/non-staff denial and missing/invalid CSRF rejection using local test requests. Verify public pages remain unchanged and never expose the archived drafts.
5. Check narrow screens and the established Apricot Glow/official branding. Authentication, publishing workflows and Media Library implementation were not changed.

No commit, push, merge, deployment, remote database operation or production deletion was performed. Existing staged/unstaged work was preserved.
