# Milestone 05B — Community Events Editor

The News & Events workspace now has Announcements and Events tabs. Events are private drafts only. Moderator, Administrator and Owner accounts can search event titles/descriptions, create drafts at `/control/events/new`, and reopen/edit them at `/control/events/:eventId`. Existing announcement URLs and behavior are retained.

## Checkpoint and storage

Before implementation, all 128 tracked/unignored project files were copied to a verified ZIP with SHA-256 manifest, branch/HEAD metadata, Git status and binary working-tree patch. The checkpoint is `.wrangler/checkpoints/before-05b-20261018-133037/`, based on HEAD `b786025477dcdf4a98d3a4e0f5749b8355ff65d2` on `feature/public-website-routing`. This is a local recovery archive, not a commit. The existing uncommitted work was preserved.

No migration was added or applied. Events reuse `content_items`, `events`, `content_revisions` and `audit_records`, including the existing append-only history/audit triggers. Start and end remain exact UTC epoch milliseconds, accompanied by the IANA timezone. Only non-fixture event drafts with no publication timestamp can be edited. Published/review/scheduled/archived records and announcements are excluded. Editing does not change an existing event's active/cancelled state.

Creation uses the existing transactional draft utility. Updates guard the content revision and draft state inside one D1 batch, then update event fields and append the complete snapshot and audit record. A lost race or state change aborts every write and returns HTTP 409. History displays the latest 20 safe presentation entries; all older entries remain stored. Actor IDs, session data and complete audit payloads stay server-side.

## Time handling and compatibility

The scheduling UI has been simplified: one event date picker, Start Time and End Time dropdowns in 15-minute increments, familiar AM/PM labels, and fixed Toronto time (`America/Toronto`). Same-day is the default; “Ends on another day” reveals an optional end date. A readable summary appears before Save draft and in preview. Neither scheduling controls, preview, event-list metadata nor editor history display seconds, milliseconds, raw timestamps or UTC offsets. Machine-readable HTML attributes and hidden preservation fields remain internal.

`@js-temporal/polyfill` was installed and tested in local Cloudflare workerd before application integration. A dedicated bundled Worker test also exercises the application time resolver. Tests cover Toronto's skipped/repeated hours, Lord Howe's 30-minute change, Kathmandu's fractional offset, and exact round trips.

The server independently validates the submitted date and clock controls, enforces 15-minute choices for new or changed endpoints, and always uses Toronto. It rejects malformed calendars, unsupported timezone tampering, instants before the schema's Unix-epoch lower bound, and nonexistent local times. Skipped times receive a friendly clocks-jump-forward message and are never silently shifted.

Only repeated times reveal clarification: for example “First 1:30 AM” and “Second 1:30 AM.” No default is selected. The server independently requires the choice. Changing an endpoint clears its choice; changing the shared date clears both for same-day events. End must follow start after resolving both exact instants, including ranges crossing a repeated hour. The summary identifies first/second times when relevant without exposing offsets.

On reopening, inputs and occurrence choices are reconstructed from saved exact instants in Toronto time, including older drafts saved in another timezone. Existing off-quarter times appear as a “saved time” dropdown option. Existing seconds/milliseconds are retained internally, without displaying them. The server permits that precision only when it matches the corresponding currently saved endpoint; hidden originals cannot introduce arbitrary off-grid times. Editing a title/body or the other endpoint preserves the unchanged exact instant. Choosing a new endpoint uses the new quarter-hour selection. No separate occurrence column or migration is needed.

## UI and safeguards

The event editor shares public event formatting/status rules and safe `ContentBody` rendering. Its preview is explicitly private and never requires invented publication metadata. Incomplete/invalid dates show errors instead of fabricated timing. Apricot Glow, official SVG branding, compact staff-tool headers, Overview's personalized welcome, and responsive sidebar are retained.

Every loader requires Moderator or higher. Every mutation checks role, session, exact Origin and session-bound CSRF before parsing/reflecting event content. Responses use private/no-store, Vary: Cookie, security headers and noindex metadata. Forms are bounded at 256 KiB; title/body limits are 160/40,000 characters. Duplicate fields and unsupported publication/scheduling/cancellation/deletion intents are rejected.

Validation failures and HTTP 409 responses retain all submitted text, local dates, timezone, occurrence selections and revision. Conflict forms disable saving and link to the latest draft in another tab. Unsaved changes are not persisted across reload/navigation; copy them before reloading. Requests exceeding the transport limit are rejected rather than reflected.

No publishing, automatic scheduling jobs, remote migrations, remote resource changes, production deployment or actual community-event seed data were introduced. Authentication and Media Library implementation are unchanged.

## Manual browser checklist

Use the existing verified local development origin and `content_dev` D1 configuration. No new migration, seed command or secret changes are required.

Reuse the running local development session, or start one from `website/`:

```powershell
$env:CLOUDFLARE_ENV = 'content_dev'
npm.cmd run dev -- --port 5173
```

Use the port/origin already configured for the working Discord login; do not start a second session on a different origin accidentally.

1. Sign in with an authorized staff account. Confirm Overview still has the welcome/account/role block; News & Events and its editors have only their compact section labels and page titles.
2. Open News & Events → Events → New event. Enter your own clearly labeled local test title/body, choose a date and AM/PM start/end times. Confirm one calendar control by default, 15-minute choices, and a readable Toronto-time summary. Save, reopen and edit. Check persistence and revision increments. Enable “Ends on another day” to test an overnight event.
3. Choose November 1, 2026, start 1:30 AM and end 2:30 AM. Confirm “First 1:30 AM” and “Second 1:30 AM” appear only for the ambiguous start, with no offsets or timestamps. Select the second occurrence, save and reopen. Confirm the second choice remains selected; editing only the body must preserve the schedule. Existing non-quarter or sub-minute drafts must retain their exact instants, with no precision shown to staff. These dates are test inputs, not community events.
4. Change a date or time and confirm the affected occurrence choice clears. Choose March 8, 2026 at 2:30 AM; confirm the friendly clocks-jump-forward error and no silent adjustment. Test end equal to/before start. Test a range from first 1:45 AM to second 1:15 AM during the repeated hour: it is a valid 30-minute interval.
5. Clear/oversize a required field (bypass browser validation only for a local server check). Confirm HTTP 400 and retention of all other fields and selected occurrence. HTML/scripts and unsafe Markdown links must remain inert in preview.
6. Open one draft in two tabs. Save tab A; submit tab B's stale revision. Confirm HTTP 409, all tab B values remain, saving is disabled, and the latest-draft link opens tab A's saved version. Copy desired changes before reloading.
7. Search event title and description text. Check empty results and paging; `%`, `_` and SQL-like strings are literal. Switch tabs and confirm announcement search/create/edit/preview still work.
8. Confirm new drafts never appear on the homepage or `/updates`; `/updates/<event draft UUID>` must not expose the draft. Existing published content remains unchanged.
9. Check signed-out/non-staff denial. Locally remove the hidden `_csrf` field and submit: expect HTTP 403 and no new revision. Never share cookies or CSRF values.
10. Check keyboard navigation, labels, radio groups, focus indicators and 320/390px layouts. Reopen the working Media Library and confirm its normal workflow remains intact.

## Automated verification

Run from `website/`:

```powershell
node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types tests/control-build.mjs
node --test tests/temporal-worker.test.mjs
git diff --check
```

The serial test command reduces local workerd contention on Windows. The first parallel full-suite run had one ECONNRESET during isolated D1 setup (before event actions), and the isolated retry passed. No application retry or weakened assertion was added. Test databases are nonpersistent, use an explicit empty-env fixture, and disable remote bindings.

Final results after the scheduling simplification on October 18, 2026: **64 tests passed, 0 failed** in the complete serial run; typecheck, client/server production build, built-route checks, local workerd Temporal/application resolver checks and `git diff --check` all passed. Built-route checks also preserve legacy off-grid seconds/milliseconds while converting display/storage timezone to Toronto. No additional dependency or migration was needed for the simplification.

Built-route coverage checks event create/edit/reopen, HTTP 400/409 preservation, list integration, private headers, staff/member denial, public draft isolation, and preservation of an existing published event. Existing announcement/authentication/media suites remain included.

Browser artifacts under ignored `.wrangler/events-review/` are clearly illustrative static React-component fixtures, not authenticated browser sessions or persisted community events.

Headless Edge reviewed valid, ambiguous, nonexistent-time, conflict, listing and Overview fixtures at 1440, 390 and 320 pixels (18 combinations). All retained one main heading and visible focus outlines; no horizontal overflow was detected. Both occurrence offsets were visible, the saved later choice and millisecond input values were retained, and conflict forms disabled saving. Actual screenshots were visually inspected on desktop and narrow mobile layouts. The checkpoint comparison confirmed authentication, Media Library implementation, migrations, both official SVG files and palette tokens unchanged.

The simplified scheduling UI was subsequently reviewed in the same 18 fixture combinations, with friendly first/second labels and no visible offsets or raw timestamps. An interactive React browser fixture additionally exercised changing the shared date, selecting Start/End dropdown values, choosing the second repeated time, revealing/changing the optional end date, returning to same-day, and rejecting a spring-clock gap. Actual desktop/mobile screenshots were inspected at 1440, 390 and 320px, with no horizontal overflow. Artifacts are under ignored `.wrangler/scheduling-review/`; no real event was created or authenticated browser session used.
