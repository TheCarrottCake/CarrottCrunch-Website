# Phase 7B - Public Staff Directory implementation and migration review

November 11, 2026 (America/Toronto). Proposed implementation is uncommitted on
`feature/cinematic-redesign-v3`, based on `f556f0c`, preserving uncommitted Phase
7A and its confirmation-layout correction. No commit, push, merge, deployment,
remote operation or coordinated cross-page redesign.

**Persistent migration approval is required.** The implementation was developed
and tested on disposable D1/R2. Existing local D1 still ends at migration 0013;
a read-only query confirms none of the three proposed profile tables exists.
The proposed SQL is outside `website/migrations/`, so normal migration commands
cannot accidentally apply it. Private Profiles shows an approval notice until
schema approval/application; public Directory shows an honest unavailable state.

## Functional routes and permissions

- `/control/staff-profiles`: active Moderator/Administrator/Owner can edit only
  their own private draft and consent/withdraw. Target account and role cannot
  be supplied by the browser. The actual role comes from authorized staff data.
- Administrator/Owner additionally see exact consented snapshots for publication,
  with private submitting account name/username to verify who actually consented.
  The confirmation requires verification of that account and the selected
  publication action; public display names are not account identities.
- `/community/staff`: anonymous/member access to explicit public projections of
  published, currently active staff only. Community page links to this directory;
  primary navigation has no added destination.
- `/media/staff/:profileId/:releaseId`: guarded PNG portrait derivative only.
  Neither account IDs nor Media Library asset IDs appear in public portrait URLs.
- Phase 7A staff-access authority stays Owner-only. Administrator publication
  authority does not grant role-management authority. Regular members cannot
  enter the profile editor. Staff Voices remains separate and unchanged.

## Draft, review, consent and publication

Draft fields: separate public name (80 characters), optional biography (1500),
optional chosen Media Library portrait and descriptive alt text (200). No Discord
avatar/name is automatically copied. Roles are derived/read-only, not submitted
or self-assigned. Drafts start unpublished and are never public-loader fallbacks.

The saved-draft preview shows actual name/role and only optional fields selected
by the consent checkboxes. Consent to name and actual role is mandatory; biography
and portrait are individually optional. Portrait consent includes its required
credits. Existing required-credit metadata is shown in private preview and public
presentation. Optional unconsented fields are absent from the immutable consent
snapshot and public data, even if retained in the private draft.

Consent creates immutable evidence of the exact selected content, actual role
and access version, flags, actor and timestamp. A separate current-consented
snapshot remains visible to the subject. Administrator/Owner publication points
to this exact snapshot, not to subsequent private edits. Publisher can publish or
hide, not edit somebody else's draft or invent consent. It is not Content Studio
approval and introduces no approval gate into Content Studio V2.

Any saved edit clears prior consent and publication, even if seemingly minor;
this conservative behavior is stated in the editor. Renewing consent also hides
until publication. Withdrawal hides the current profile immediately, deliberately
working from a stale form rather than failing to hide a newer version. Changing
a staff role or activation flag clears consent/publication via a proposed database
trigger. Reactivation or reverting a role does not resurrect an old profile.
Fresh consent and publication are required.

## Authorization, conflict and privacy safeguards

Private loaders/actions reuse staff authentication and same-origin CSRF checks.
Every write rechecks the active actor's current role and exact unrevoked/unexpired
session inside its SQL transaction. Draft/consent operations derive the owner
from that session. Publication requires current Administrator/Owner authority,
matching profile version and exact current consent; stale operations return 409.
Successful mutations, snapshots/releases and attributable audit records are
atomic. Audit failure rolls back the profile change. No automatic conflict retry.
Failed draft validation preserves submitted draft input for review.

Public data is explicitly projected to opaque public ID, consented name, actual
consented role, selected biography and eligible portrait URL/alt/required credit.
No Discord IDs, private account records, session data, audit history, actor IDs,
consent evidence, private draft fields or moderation reports leave public loaders.
The private publication view's account provenance is not part of that projection.
Private responses are private/no-store with Vary: Cookie and noindex; public
profile/image responses are no-store. No private originals or arbitrary R2 keys
can be requested through the new media route.

Portrait preparation reuses `studioDerivative`'s byte-integrity/rights checks and
private derivative cache. Profile delivery independently requires the exact live
profile release and consent, active staff with unchanged role/access version,
current asset/source hash, immutable derivative and valid rights. It hashes the
served bytes and rechecks eligibility before responding. Withdrawal, unpublish,
role/deactivation and rights revocation disable prior URLs. Restoring rights alone
does not restore old portrait authority. Required credits follow central media
metadata; optional creator/internal metadata is not copied into public profiles.
If a portrait becomes ineligible, the directory omits it while eligible consented
name/role/biography may remain visible. New publication of an ineligible consented
portrait is rejected. Existing Media Library preview remains authenticated/private.

## Exact proposed migration 0014

Review [0014_staff_profiles.sql](proposed-migrations/0014_staff_profiles.sql).
SHA-256: `bf4a0a219dae4f7bbb21accfe06b1b3340d70c47f08556f2f35425b92362007e`.

Three additive tables, empty by default:

| Table | Storage and purpose |
| --- | --- |
| `staff_profiles` | Opaque public ID, private owner FK, optimistic version, private draft fields, current consent/live-release pointers, update time |
| `staff_profile_consents` | Immutable exact selected public content, actual role/access version, field flags, private actor FK, portrait/source/derivative references and consent time |
| `staff_profile_releases` | Immutable publication decision referencing exact profile/consent, private publishing actor and timestamp |

Indexes/guards include unique owner, profile-consent lookup, append-only consent
and release triggers, exact owner/draft/role binding on consent, authorized exact
release binding with media checks, and invalidation when role/access changes.
A profile-reference trash guard prevents soft-trashing an image still attached
to a profile draft/current consent. Remove/change the draft attachment first;
old immutable historical references do not alone block recoverable trash.

Existing generic append-only `audit_records` is reused for profile changes under
`entity=staff-profile`; private audit JSON records operation/public-profile ID,
with attributable actor/timestamp columns. Consent content/evidence stays in the
separate private consent table. No Content Studio tables, role definitions, old
migration files, account rows or R2 objects are rewritten by this migration.
No profiles, biographies or portraits are seeded.

### Persistent-data and retention decision for owner approval

Application is additive but not zero impact: later staff edits create private
drafts; consent retains exact historical names, biographies and portrait references;
publication retains decisions and actor attribution. Withdrawal clears current
visibility/consent pointers, **not immutable historical evidence**. There is no
automatic evidence-retention purge. Approval should include this private retention
model, or request a revised retention/deletion design before applying 0014.

Actual portrait consent may create private derivative cache objects. Failed/racing
preparation may leave private unreferenced objects, as with existing Studio media.
No automatic cleanup/purge is added. No persistent portrait preparation was run
for this development task; all synthetic media remained in disposable R2.

### Application plan - only after explicit approval

1. Review this exact SQL/digest and confirm retention and media-reference behavior.
2. Quiesce local writes and make a consistent SQLite backup including the migration
   ledger using the existing safe backup procedure; verify backup integrity. Do
   not copy only a live WAL-backed SQLite file or overwrite existing checkpoints.
3. Reconfirm ledger through 0013 and no conflicting 0014; copy the approved draft
   to `website/migrations/0014_staff_profiles.sql` only after approval.
4. Apply via the established **local-only** migration ledger workflow. No reset,
   reseed, remote migration or R2 modification. Verify once-only ledger application,
   empty new profile tables and unchanged existing account/content/media records.
5. Recheck role logins, own-profile/consent/publication/withdrawal and prior image
   suppression, then obtain owner review. No production activation is implied.

No part of that persistent application plan was executed.

### Rollback and preservation

Prefer code/feature rollback: remove/disable new routes and navigation; retain
new private records/evidence rather than dropping them or restoring an entire
old database over unrelated newer work. Old public profile/portrait URLs should
be unavailable. The additive tables/guards can remain dormant. Any schema removal,
consent-data deletion or orphan-media cleanup requires a separate reviewed plan
and backup; do not edit/delete append-only evidence as an ad hoc downgrade.
The schema change needs no destructive reversal to keep existing V2 features.

## Tests and browser evidence

- Full regression: **165 passed**, zero failures/skips.
- `npm.cmd run typecheck` and production build: passed.
- `tests/staff-profiles-worker.mjs`: schema absent/present, actual private/public
  routes, own-only edits despite forged target/role fields, mandatory consent,
  derived roles, publisher permissions, CSRF and withdrawal passed.
- Existing `staff-management-worker.mjs`, `control-build.mjs`,
  `studio-v2-worker.mjs`, `about-memories-worker.mjs`: passed, including Cron.
- Service tests apply draft 0014 only to disposable D1 and verify existing staff
  data preservation, empty state, optional-field omission, immutable snapshots,
  concurrent draft conflicts, withdrawal vs stale publication, deactivation/role
  cycling, stale publisher sessions, audit rollback, source/derivative integrity,
  portrait rights/revocation/restoration and profile-reference trash protection.
- Expected framework cross-origin rejection logs are assertion-covered results.
- `git diff --check`: passed. No new dependencies or persistent migration.

Edge reviewed actual built routes at **1440, 1024, 760, 390 and 320px**: directory,
own editor and publisher view. No horizontal overflow, one H1 per page, readable
full checkbox wording, keyboard focus/Space, exact optional-field preview changes,
and Media Library dialog Escape/focus restoration pass. Review fixtures contain
clearly labelled synthetic profiles only; no real profiles were published.
Screenshots and browser scripts/results are ignored local artifacts:

- 1440px: [Directory](../.wrangler/phase7b-review/directory-1440.png), [Editor](../.wrangler/phase7b-review/editor-1440.png), [Publisher](../.wrangler/phase7b-review/publisher-1440.png)
- 1024px: [Directory](../.wrangler/phase7b-review/directory-1024.png), [Editor](../.wrangler/phase7b-review/editor-1024.png), [Publisher](../.wrangler/phase7b-review/publisher-1024.png)
- 760px: [Directory](../.wrangler/phase7b-review/directory-760.png), [Editor](../.wrangler/phase7b-review/editor-760.png), [Publisher](../.wrangler/phase7b-review/publisher-760.png)
- 390px: [Directory](../.wrangler/phase7b-review/directory-390.png), [Editor](../.wrangler/phase7b-review/editor-390.png), [Publisher](../.wrangler/phase7b-review/publisher-390.png)
- 320px: [Directory](../.wrangler/phase7b-review/directory-320.png), [Editor](../.wrangler/phase7b-review/editor-320.png), [Publisher](../.wrangler/phase7b-review/publisher-320.png)

Manual checks remain: real Discord per-role sessions at the configured origin,
actual staff identity/consent and portrait-rights review, publication with genuine
media, screen readers and physical mobile devices. External font requests were
blocked in browser automation; final shared visual design remains deferred.
Schema approval/application is the current blocker to using this feature with
persistent local staff data. Tests are not permission to migrate or publish.

## Affected source/document paths (Phase 7B additions to uncommitted 7A)

```text
website/app/lib/staff-profiles.server.ts
website/app/routes/control-staff-profiles.tsx
website/app/routes/community-staff.tsx
website/app/routes/staff-portrait.ts
website/app/routes/community.tsx
website/app/routes.ts
website/app/lib/dashboard-tools.ts
website/app/components/control-dashboard.tsx
website/app/app.css
website/tests/staff-profiles.test.mjs
website/tests/staff-profiles-worker.mjs
website/tests/dashboard.test.mjs
website/tests/navigation.test.mjs
website/docs/proposed-migrations/0014_staff_profiles.sql
website/docs/phase7b-public-staff-directory.md
website/docs/phase7b-staff-directory-proposal.md
website/docs/project-status.md
```

Phase 7A management service, route, permission model, confirmation layout fix and
security tests are retained. Official branding, Staff Voices, approved homepage,
Games, Servers/Create, Safety, About, Gallery and Content Studio implementations
are unchanged. The Community page gains only its required directory link.
`AGENTS.md.backup`, unused game-art concepts, prior audit and local private state
remain untouched and outside staging. Nothing is committed or staged.
