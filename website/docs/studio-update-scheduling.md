# Content Studio - Update and Schedule Update

November 11, 2026. Correct C: V3 checkout; all changes remain uncommitted.

## Cause and implementation

Direct updating already existed in `studioSave`: the submitted snapshot is
validated, saved as a new immutable revision, and released atomically. It does
not require a preceding private save or Unpublish. The UI obscured this behind
Save Changes, put scheduling/private saving under More, and exposed Unpublish
as a prominent action. No duplicate publication service or scheduler was needed.

The existing shared StudioEditor now provides:

- No live release: Publish, Schedule Publication, Save Draft, Preview.
- Live release: Update, Schedule Update, Save Draft, Preview.
- More: explicit Unpublish, cancellation, archive and authorized cleanup.

This applies to About Memories, homepage/banners, Community Gallery, posts and
events. Labels depend on the actual live pointer, including when a separate
working revision is scheduled. Item dialogs still save only to working form state.
Update submits that current form snapshot directly to the existing publish action,
including unsaved added photos/captions. Rights/alt validation, version checks,
CSRF/authentication and guarded atomic release writes remain unchanged.

The private loader now reads the exact live/pending release metadata for this
document. Working, live and scheduled revision numbers are displayed separately.
Success feedback identifies the saved working revision and the revision now live,
or the scheduled revision while the existing live version stays unchanged.
These numbers come from protected database reads, not submitted query values.

## Scheduling behavior retained

Schedule Update saves the intended current edits and schedules their exact new
revision through the existing Toronto/DST/quarter-hour helpers and Worker Cron.
The old live pointer remains until the scheduled transaction succeeds. Release
history and audits remain immutable; stale writes, expired/revoked media and
inactive staff cannot authorize a replacement. Existing Cron remains idempotent.

**Saving or restoring a later draft cancels its pending schedule**, as V2 already
did. It does not substitute later edits into that release. The schedule dialog
explains this, and Save Draft asks for confirmation when a pending schedule exists.
To schedule the newer revision, staff must choose Schedule Update again. No
attempt was made to keep a schedule attached to a superseded working revision,
which would conflict with existing schema guards and cancellation semantics.
This is cancellation, not continued execution of the original schedule after a
later private save. The cancelled release remains in immutable history.

Save Draft never changes the live release. Restoring history creates a private
revision. Unpublish happens only through its explicit confirmed More action.
No approval queue or new migration was introduced; proposed 0014 remains unapplied.
No persistent D1/R2 records, production resources or public designs were changed.

## Validation and screenshots

171 full regressions, typecheck, build and git diff --check pass. Current
built-route/authentication, Content Studio V2 Worker/Cron, About Memories Worker,
Staff Management Worker and Staff Profiles Worker checks pass using disposable
storage. Existing suites cover role/CSRF/version/rights/restore/unpublish boundaries.
The expanded About Worker explicitly exercises direct unsaved photo additions and
caption updates, revision-specific success feedback, private save isolation,
scheduled replacement via real Cron, and later-edit cancellation without altering
the retained scheduled release revision.

Authenticated isolated Edge review passes at 1440, 1024, 760, 390 and 320px:
Update actions, Unpublish under More, scheduling dialog and no horizontal overflow.
Homepage/Gallery and new post/event action states were also checked. Review uses
an access-gated disposable fixture, not owner content or real staff sessions.

- [Desktop toolbar](../.wrangler/studio-update-review/toolbar-1440.png)
- [Mobile toolbar](../.wrangler/studio-update-review/toolbar-390.png)
- [Desktop schedule dialog](../.wrangler/studio-update-review/schedule-1440.png)
- [Mobile schedule dialog](../.wrangler/studio-update-review/schedule-390.png)

Other widths and result JSON are in the same ignored review directory. Real
Discord sessions, physical devices and screen readers remain manual checks.

Files: `app/components/studio-editor.tsx`, `studio-actions.tsx`,
`app/lib/studio-route.server.ts`, `tests/studio-v2-ui.test.mjs`,
`tests/about-memories-worker.mjs`, this handoff and project-status documentation.
The transaction/scheduler implementation and SQL schemas were not modified.
All earlier uncommitted collage, photo protections and Phase 7A/7B work is retained.
