# Milestone 05C — Review and publication

## Scope and preservation

Before implementation, the existing binary Git diff and status were saved under the ignored `.wrangler/checkpoints/05c-before/` directory. Untracked files were copied there and their SHA-256 hashes verified. Existing uncommitted editor, deletion, palette, package and branding work was retained. This is a recovery checkpoint, not a commit.

The persistent **local** D1 inventory queried non-fixture `published`/`scheduled` rows before strict public checks were introduced. It returned **zero rows**. Migration `0008_content_publication_workflow.sql` was applied locally. Existing content, account, media, revision and audit rows are not rewritten by this additive migration. No historical approvals are fabricated.

Before any future production activation, inventory that environment separately. If real legacy published/scheduled rows exist, stop for review and obtain explicit approval/publication authorization for their exact content; do not simply turn on the new public gate. Production database bindings, migrations, deployment and Cron activation remain outside this milestone.

## Staff workflow

- Moderators and higher can save working copies and submit a saved editorial revision.
- Administrators and Owners can approve or return a submission for revision, with an optional explanation. Explicit self-approval is allowed. Approval alone never publishes.
- Administrators and Owners separately authorize Publish now or Schedule publication.
- Saving creates a new immutable editorial revision, returns the working copy to Draft, and invalidates its approval and pending schedule. Its audit captures the invalidated approval and cancelled release IDs. The existing live version remains visible and unchanged.
- Cancelling a schedule returns the unchanged editorial revision to Approved. Rescheduling creates a new immutable release authorization.
- Unpublish clears public visibility and pending schedules, retains editable content, and requires fresh review before another release.
- Archive clears public visibility and pending schedules and closes the working item. There is no archive restoration UI.

The management screen provides searchable status filters. `/control/review` combines pending announcements and events, oldest first, with submitter and time. `/control/workflow/:contentId` previews the exact saved editorial revision and provides authorized controls/history. Overview and News & Events show pending-review and overdue-schedule counts on load; these are indicators, not push notifications.

Draft trash remains available only for never-released, unpublished working drafts in Draft status. It cannot remove a pending-review/approved/scheduled/live item. Previously released content uses the Administrator/Owner unpublish/archive actions instead. Archived items are excluded from default management lists and can be inspected with the Archived filter.

## Storage and public isolation

The migration adds `content_workflows`, immutable `content_reviews`, immutable `content_releases`, indexes, validation/append-only triggers and `approved_public_content`.

Workflow state is separate from the old `content_items.state`. The old state is **not approval evidence**. The existing content/subtype rows remain the working copy; the public view projects the title, body and event timing from the immutable revision referenced by the executed live release. This avoids copying private replacement fields onto a live public row. Stable IDs/slugs and public DTOs are retained. The fixture branch of the view remains available only through the existing trusted development demonstration setting, which production builds disable.

An approval references `(content_id, editorial_revision)` and its explicit submission. A release authorization references that same approval/revision and records the authorizing staff identity, action-time role, due instant and timestamp. Workflow actions increment a separate concurrency version and append audit records without changing the approved editorial revision number. Historical reviews, releases, revisions and audits cannot be updated or deleted.

Staff requests use current server-side roles, exact same-origin CSRF validation, bounded forms and parameterized SQL. Mutations recheck role, revision, workflow version and eligibility within the same guarded D1 batch as their audit/decision writes. Losing races return HTTP 409. Fetcher forms preserve entered scheduling/explanation values on errors and block repeated submissions; conflict actions require a reload. Existing editor validation/conflict preservation remains intact.

## Scheduling

Publication scheduling uses one date picker, 96 quarter-hour AM/PM options, fixed `America/Toronto`, a readable summary, and the existing Temporal resolver. Gaps are rejected. Only repeated fall times request First/Second clarification. UTC epoch milliseconds are stored internally; staff are not asked to manage zones or offsets.

`workers/app.ts` now exports a scheduled handler. Only the local `content_dev` configuration has `* * * * *`; the default production configuration has no Cron or database binding. Each sweep selects up to 50 eligible due authorizations, including overdue ones. It rechecks current authorizer permission, revision, approval and pending-release identity in the publication transaction. Revoked authorizers remain blocked and visible as overdue; they do not block other authorized rows in the selection. Already-published releases remain visible after subsequent role revocation.

Overlapping/repeated invocations cannot duplicate the publication or audit because the pending-release pointer is atomically consumed. An audit failure rolls back publication, leaves the authorization pending, and is retried by a later sweep. Failures are counted while other selected items are processed; the Worker then reports a failed invocation. Publication time is the actual successful release time. Cron is not an exact-second delivery guarantee, and a backlog above 50 eligible items takes additional sweeps.

Local development does not automatically tick Cron. From `website/`, after building, run:

```powershell
node --experimental-strip-types tests/publication-worker.mjs
```

This starts isolated local workerd/D1, calls the **built application's scheduled handler directly twice**, verifies exactly one publication/audit, and only then sends the first visitor request. It does not depend on someone opening the website. For interactive local testing, start the content development environment and use Cloudflare Local Explorer's Cron trigger control; no production trigger is activated.

## Verification commands

From `website/`:

```powershell
node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types tests/control-build.mjs
node --experimental-strip-types tests/publication-worker.mjs
node --experimental-strip-types tests/media-worker.mjs
```

Tests cover explicit self-approval, revision invalidation, safe live replacement, combined review queue, rejection, authorization/CSRF, stale actions, immutable records, transaction rollback, duplicate/overdue Cron, revoked authorizers, Toronto DST validation, raw-state publication isolation and legacy-record preservation. Existing announcement/event/deletion/media/auth/branding regressions are retained. React Router rejects cross-origin document actions with 400 before the application action; direct application CSRF failures return 403.

Implementation verification: all **84** tests passed. The final focused workflow run passed **11** tests, including populated legacy migration preservation. Typecheck, client/server build, built-route checks, the built workerd scheduler test, the built media Worker regression and `git diff --check` passed. The automated suites use isolated local databases. Manual visual/keyboard verification of the new screens remains the checklist below; it has not been claimed as completed.

## Manual browser checklist

Use clearly labelled test content in local D1 only.

1. As Moderator, save and reopen an announcement and an event. Submit each and find both in the combined queue. Verify approve/publish/schedule/unpublish/archive controls are absent.
2. As Administrator/Owner, inspect the saved revision and reject with an explanation; confirm Draft status, recorded reviewer/time/explanation and retained fields. Resubmit and explicitly approve your own content. Verify it is still absent from public pages.
3. Publish and check the homepage, Updates and announcement detail where applicable. Save a private replacement and confirm visitors still see the old title/body/event timing. Resubmit, approve and publish the replacement.
4. Schedule a future quarter-hour time and read the Toronto summary. Verify the spring gap is rejected and the fall overlap requires First/Second. After a validation error or simulated stale action, confirm selected values remain intact.
5. Trigger local Cron without visiting the public site. Test an overdue release and a repeat invocation. Revoke a pending authorizer's role and verify it remains blocked; confirm existing live releases remain visible.
6. Cancel a schedule. Unpublish a live item and confirm public removal with editable saved content. Archive and confirm public removal, cancelled schedule, closed editor and retained history.
7. In two tabs, race approve/reject, publish/publish, or save/publish. Verify HTTP 409 feedback, no duplicate audits and no private replacement leakage.
8. At desktop and narrow mobile widths, check layout, readable contrast, visible keyboard focus, labels and confirmation dialogs. Cancel/Escape must not unpublish/archive; focus must return to the initiating button. Recheck draft deletion and Media Library upload/preview/trash/restore.

No manual production operations or deployment are part of these checks.
