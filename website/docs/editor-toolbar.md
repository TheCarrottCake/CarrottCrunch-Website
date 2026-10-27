# 05C editor toolbar cleanup

Both announcement and event editors now use `EditorToolbar`. Save is associated with the existing editor form by its form ID; no forms are nested. The title, workflow status, exact saved editorial revision and saved/unsaved state remain in a sticky cream toolbar. It stays in the main content column on desktop and scrolls below the static mobile navigation. Buttons wrap at narrow widths; More uses a bounded mobile panel.

The old lower Save rows, separate Review & publication buttons and permanently displayed scheduling/actions sections were removed. History is available in a dialog from More. The saved-revision review screen shares the same controls. Apricot Glow tokens, sidebar layout, authentication, Media Library, public rendering and official SVG files are retained.

## Actions

- New content must be saved first.
- Moderators receive Save and Submit for Review, plus permitted draft deletion and History in More.
- Administrators/Owners receive Save, Approve & Publish, and Schedule Publish for a saved Draft, Pending Review or Approved revision. More offers Submit for Review on drafts, Approve Only/Reject on pending reviews, Cancel schedule on scheduled items, and eligible Unpublish/Archive actions.
- Save is disabled when an existing saved copy has no edits, avoiding unnecessary approval invalidation.
- Unsaved/invalid submitted changes disable workflow mutations. Save and the existing validation/conflict-preservation behavior remain available; a 409 requires comparison/reload. Deletion still explicitly confirms discarding unsaved changes.
- Approve & Publish identifies the saved revision, title and public visibility in a confirmation. Schedule Publish opens a compact date/quarter-hour AM/PM dialog in Toronto time. DST gaps are rejected; repeated times require First/Second selection. Validation errors retain dialog fields.
- Cancel/Escape never submit. Dialogs contain keyboard focus and return it to the initiating control or More summary. The native More disclosure supports Tab, Escape, and outside-click closing. Submission latches prevent repeated workflow requests.

## Transactional combined operations

No migration or dependency was needed. `changeWorkflow` now composes the existing validated transitions into a **single D1 batch**:

1. A Draft gets a real submission record.
2. A pending submission gets an explicit approval record for its exact editorial revision.
3. The approved revision gets a publication or scheduled-release authorization.

An already-valid approval is reused rather than fabricating another approval. Each actual transition records its existing immutable audit entry and checks role, state, revision and workflow concurrency version. A failure anywhere rolls back submission, approval, authorization, workflow state and audits together. Duplicate/concurrent operations have one winner. Existing Cron guards, cancellation behavior, role-revocation checks and live-revision isolation remain unchanged.

Workflow requests from editors use a fixed `returnTo=editor` marker, validated server-side. The server constructs the destination from the stored content kind; arbitrary return URLs are rejected. Archive returns to management. Requests from the review screen retain its existing return destination.

Existing work was preserved in ignored `.wrangler/checkpoints/before-toolbar/`, including a binary tracked patch and hash-verified copies of untracked files. No remote resources, database migrations, commits, pushes, merges or deployments are part of this change.

## Browser verification

Use local test content and current local migrations only.

1. Open both new and saved editors as Moderator, Administrator and Owner. Verify one top toolbar, one page title, correct state/role controls, and no lower duplicate action rows.
2. Scroll on desktop and at 390px/320px. Check sticky positioning, readable title/status, button wrapping, More menu bounds, and focused fields remaining below the toolbar.
3. Change any announcement/event field. Verify Unsaved changes, enabled Save and disabled workflow mutations. Save and confirm the correct revision and Saved state. Repeat with invalid fields and stale saves; ensure text and exact event timing remain intact.
4. On a saved draft, open Approve & Publish. Check the title/revision/public visibility explanation. Cancel and Escape without publication. Confirm once and verify explicit submission/approval/release history and public visibility. Double-click/repeat and verify no duplicate records.
5. Open Schedule Publish. Check one date picker, AM/PM quarter-hour options, Toronto summary, spring gap rejection and first/second fall occurrence. Validation and 409 feedback must preserve values. Trigger local Cron to verify the approved saved revision publishes once.
6. Publish a version, edit privately, and schedule its replacement. Confirm the original live title/body/event timing stays unchanged until release. Check schedule cancellation and role-revocation behavior.
7. Use More for Approve Only, Reject with an optional explanation, History, Unpublish, Archive and permitted Delete draft. Check initial focus, Tab/Shift+Tab containment, Escape, Cancel, focus return and safe confirmation behavior. History/More must not discard typed edits.

Automated validation uses isolated local D1 and built-route/Worker checks. Headless Edge review fixtures use illustrative content and mocked workflow failures, not an authenticated staff session or real publishing. Browser artifacts are ignored under `.wrangler/toolbar-review/`.

## Results

- Full serial regression suite: **89 passed, 0 failed**.
- Focused combined-operation tests: **14 passed**; affected editor/toolbar UI checks: **9 passed**, with the final toolbar feedback checks rerun successfully.
- `npm run typecheck`, `npm run build`, built control route checks, built local workerd publication checks, Media Library Worker regressions and `git diff --check`: passed.
- Headless Edge: both editors at 1440, 390 and 320 pixels passed sticky positioning, one main heading, no horizontal overflow, bounded menus/dialogs, Tab containment, Cancel/Escape/focus return, repeated-submission protection, Toronto ambiguity, preserved validation values and unsaved publication blocking. Scheduling feedback does not leak into another action dialog. Desktop/mobile screenshots were visually inspected.

The browser fixture does not replace the authenticated local staff-account checklist above. No real community content was published and no production resource was changed.
