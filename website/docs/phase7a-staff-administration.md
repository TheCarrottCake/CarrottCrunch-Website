# Phase 7A - Private Staff Administration

November 11, 2026. Implemented uncommitted for owner review on
`feature/cinematic-redesign-v3` in `C:\Projects\CarrottCrunch-Website`, based on
`f556f0cf3f5b1b30d6ffe66114a2b9fa2c0182eb`. No push, merge, deployment, remote
D1/R2 change, persistent account mutation or next-phase implementation.

## Interface and permissions

`/control/staff` adds Staff Management to Crunch Control for Administrator/Owner.

| Actor | Roster | Staff role/access changes | Administration history |
| --- | --- | --- | --- |
| Owner | Yes | Moderator/Administrator assignment; activate/deactivate staff | Latest 50 changes |
| Administrator | Read only | Denied server-side | Not supplied |
| Moderator | Denied | Denied | Denied |
| Member/anonymous | Denied | Denied | Denied |

Roster pages contain at most 25 staff entries with name, username, role and
active status. Only the Owner receives target IDs/access versions needed for
forms; Administrators receive neither. No member enumeration/search endpoint.
An Owner can grant a role to an exact Discord user ID only after that person has
signed in as a member. The Owner must verify identity before confirming.
No arbitrary new accounts, Discord invitations or bot integrations are created.

Every change requires a server-validated confirmation checkbox and CSRF token.
Forms identify the affected person and chosen access; buttons disable during
submission. A failed grant preserves the entered ID/role. Conflict responses
preserve the attempted change in a summary, require review of the latest roster
and a fresh confirmation, and never retry automatically. Roles/access are
changed together as one confirmed operation. No-op changes are rejected.

Owner status cannot be assigned, transferred or demoted through this interface.
An Owner cannot change their own access. Another Owner's activation can be
changed only while a valid acting Owner remains; an atomic active-Owner count
protects the last active Owner. This conservative boundary is intentional.

## Authorization, concurrency and privacy

The registered loader/action reuse `requireStaff`/`requireStaffAction` and the
existing same-origin/CSRF checks. Only POST mutations are accepted. Roster access
requires Administrator; writes require Owner. The SQL mutation independently
rechecks the current active Owner role and exact unrevoked, unexpired session.
An authenticated Owner snapshot alone is insufficient after session revocation.

Target `access_version`, role and active state participate in compare-and-swap
writes. Concurrent edits return 409 rather than overwriting a newer change.
Duplicate grants also conflict. Role values cannot escalate to Owner. The
existing version/session triggers invalidate prior sessions on role/access
changes; initial grants explicitly invalidate pre-grant member sessions too.
After activation the person must sign in again. Deactivation does not delete
`site_users`, content, historical attribution or the person's member account.

Each successful change and its immutable audit are committed in one D1 batch.
Audit-write failure rolls back the change and session invalidation. Records in
`audit_records` include actor ID, target ID, before/after role/access/version,
operation and timestamp under `entity=staff-administration`. IDs remain in
private audit storage; the Owner history projects display names and changes,
not arbitrary raw audit JSON, tokens or sessions. Existing append-only triggers
prevent audit updates/deletes. This is staff-access history, not community
moderation/report history. No global Activity History viewer was added.

Responses use private/no-store, Vary: Cookie, noindex, frame denial and existing
security headers. Public routes have no staff-management imports or payloads.
Staff Profiles remains an unavailable separate tool; no public directory ships.

## Database decision: no migration required

Inspected migrations 0001/0002 (audit/append-only guards), 0004 (staff accounts,
roles/access_version), 0005 (unified account/session invalidation), and current
schema through 0013. Read-only persistent ledger still ends at
`0013_about_memories.sql`. Existing schema covers all Phase 7A requirements.
No table, column, migration or database approval is needed for this implementation.
Tests use disposable databases; no existing staff access was changed for review.

Code rollback is removal/reversion of this route/service/navigation integration;
there is no schema downgrade. Authorized access changes made later would remain
as data with immutable audit history. Reverse an access change through a new
explicit, authorized operation; do not delete history or restore an entire old
database over unrelated newer content. Owner succession/recovery is outside
this interface and needs a separately reviewed procedure if requested.

## Verification

- Full regression: **156 passed**, zero failures/skips.
- `npm.cmd run typecheck` and `npm.cmd run build`: passed.
- `tests/staff-management-worker.mjs`: passed against actual built Worker.
- Existing `control-build.mjs`, `studio-v2-worker.mjs` and
  `about-memories-worker.mjs`: passed, including current Cron behavior.
- `git diff --check`: passed.

Security coverage: permission matrix, private Administrator projection,
confirmation/duplicate field validation, unknown-member denial, forged Owner
role rejection, CSRF/origin checks, concurrent edits with exactly one audit,
last-active-Owner/self protection, simultaneous Owner deactivation race, stale
sessions after deactivate/reactivate, account preservation and audit-failure
rollback. Built checks verify private headers, actual route responses, grant
conflicts and no staff identities/audit data in Homepage, Games, Servers/Create,
About, Gallery, Safety or Login. Framework-level cross-origin document POSTs
return 400 before actions; service-level invalid origin/CSRF is rejected too.
Deliberate rejected-request logs are expected assertion-covered output.

No public page, approved policy, Content Studio implementation, auth service,
branding or dependency changed. Navigation tests were updated for the new
Administrator/Owner destination without granting Moderator access.

Manual before use with real staff: owner-led sign-ins per role at the configured
origin, verify the exact candidate identity, confirmation/error recovery,
keyboard/screen-reader operation, physical-device layout and any account-recovery
procedures. Automated tests use synthetic identities and mocked auth; they do
not certify live Discord configuration. No real account changes were performed.
The initial implementation had no authenticated browser screenshots; the layout follow-up below now records synthetic authenticated built-route browser evidence.

## Files

- `app/lib/staff-management.server.ts` - private queries, validation, guarded changes.
- `app/routes/control-staff.tsx` - protected roster/forms/history.
- `app/routes.ts`, `app/lib/dashboard-tools.ts`, `app/components/control-dashboard.tsx`
  - private route and role-aware navigation.
- `app/app.css` - scoped `.staff-management` layout only.
- `tests/staff-management.test.mjs`, `tests/staff-management-worker.mjs` - security tests.
- `tests/dashboard.test.mjs`, `tests/navigation.test.mjs` - navigation expectations.
- This handoff, living status and separate Phase 7B proposal.

Public Staff Directory is approved for V1.0 but is a separate Phase 7B scope.
The coordinated site-wide design pass remains deferred.

## Confirmation layout correction - November 11, 2026

Confirmed in Edge on the actual built `/control/staff` route with a synthetic
Owner session in disposable D1, not a mocked screenshot/component. Existing
shared `.studio-workspace input:not([type=hidden])` supplied `width:100%` to the
checkbox. The Staff Management flex row's `flex:none` prevented it shrinking.
Computed checkbox and label widths were both 590px; anonymous label text was
forced into the remaining tiny width. Inherited `overflow-wrap:anywhere` then
wrapped it almost character-by-character. The label measured 1382px high and
assignment card 1822px. This was a checkbox sizing/flex interaction, not missing
confirmation content or a database/permission issue.

Exact correction: wrap each existing explanatory label text in a span; retain
the enclosing label and native required checkbox. Scope the confirmation row to
`.staff-management` with `grid-template-columns:1.15rem minmax(0,1fr)` and explicit
checkbox width/height/padding. Give form tracks, labels and text min-width:0;
inputs/selects share the available width. Preserve full wording and use natural
wrapping, including long validation messages. No global Studio selector changed.
All loader/action, permission, CSRF, concurrency, service, audit and database
logic is unchanged. No dependency or migration.

| Viewport | Text width | Confirmation height | Assignment card height |
| --- | --- | --- | --- |
| 1440 | 852px | 26px | 453px |
| 1024 | 557px | 26px | 478px |
| 760 | 560px | 26px | 466px |
| 390 | 255px | 77px | 567px |
| 320 | 185px | 102px | 642px |

Edge checks at all five widths verify no horizontal overflow, explicit checkbox
sizing, sensible text width/card height, native required-confirmation validation,
clicking the complete text toggles the checkbox, Space toggles it with visible
focus, and the actual long 409 error wraps without overflow. After an error,
confirmation is unchecked again. The synthetic unknown-member grant produces a
real error without modifying staff records. No live Discord authentication or
real user data is used.

Validation: 14 targeted Staff Management/navigation/security regressions passed;
typecheck, production build and the built Staff Management Worker test passed.
Intentional cross-origin rejection logs in the Worker test are expected.
`git diff --check` passed. Source changes for this correction are limited to the
two label text wrappers and private Staff Management CSS, plus this handoff.

Current screenshots, kept outside Git:

- [1440px normal](../.wrangler/phase7a-layout-review/staff-1440.png) / [validation error](../.wrangler/phase7a-layout-review/staff-error-1440.png)
- [1024px normal](../.wrangler/phase7a-layout-review/staff-1024.png) / [validation error](../.wrangler/phase7a-layout-review/staff-error-1024.png)
- [760px normal](../.wrangler/phase7a-layout-review/staff-760.png) / [validation error](../.wrangler/phase7a-layout-review/staff-error-760.png)
- [390px normal](../.wrangler/phase7a-layout-review/staff-390.png) / [validation error](../.wrangler/phase7a-layout-review/staff-error-390.png)
- [320px normal](../.wrangler/phase7a-layout-review/staff-320.png) / [validation error](../.wrangler/phase7a-layout-review/staff-error-320.png)

Computed before/after evidence, browser script and results are under
`website/.wrangler/phase7a-layout-review/`. Real authenticated role sessions,
physical-device and screen-reader checks remain manual. Changes remain
uncommitted, with no push, merge, deployment or production change.
