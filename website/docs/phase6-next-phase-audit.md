# Post-Phase 6 functionality audit and next-phase proposal

November 11, 2026 (America/Toronto). Read-only source audit after local checkpoint
`f556f0cf3f5b1b30d6ffe66114a2b9fa2c0182eb` on
`feature/cinematic-redesign-v3` in `C:\Projects\CarrottCrunch-Website`.
Commit: **Complete Public V3 Phase 6 and November maintenance**.
No next-phase implementation, staging, push, merge or deployment is authorized
by this report. This audit document is intentionally left uncommitted for review.
The separate older G: checkout, backup and private local state are preserved.

## Checkpoint evidence

The local commit contains exactly the 42 paths in
[combined checkpoint report](phase6-final-checkpoint.md), incorporating Phase 6B
and its latest three-section layout. Index review excluded private/generated
files, screenshots, configuration and unused game-art concepts. Dependency
review confirmed focused Cloudflare/tooling version changes; other lock entries
only normalize peer/libc metadata without version/integrity changes.

Final checks passed: 147 regression tests, typecheck, production build,
`tests/control-build.mjs`, `tests/studio-v2-worker.mjs`,
`tests/about-memories-worker.mjs`, and `git diff --check`.
The current localhost development server returned HTTP 200 without the missing
Safety stylesheet error for Homepage, Games, Servers/Create, About, Gallery,
Safety and Login. Automated authentication uses mocked Discord and disposable
D1/R2; this does not establish live credentials or launch readiness.

Immediately after commit, tracked working files and index were clean, branch
one commit ahead of the cached origin reference (no fetch/push this audit).
The only seven visible exclusions were `AGENTS.md.backup` and six SVGs under
`website/public/images/games/`; their contents were fingerprinted before and
after checkpoint and are unchanged. Ignored local D1/R2, secrets, builds and
review artifacts remain outside Git. This report adds one untracked document.

## 1. Already implemented and tested

| Area | Current implementation and source evidence | Practical limit |
| --- | --- | --- |
| Public Phase 6 | `app/routes/{servers,servers-create,games,safety}.tsx`, typed catalogs, scoped CSS and homepage preview | Content/functionality/structure approved; visual presentation is not final |
| Discord accounts | `app/lib/staff-auth.server.ts`, login/auth callback/logout and `app/routes/account.tsx` | Discord identity, avatar/name, protected account, CSRF logout and conditional Control link; no advanced member profile |
| Crunch Control | `app/routes/control.tsx`, `components/control-dashboard.tsx`, `lib/content-studio.server.ts` | Server-side staff gate plus role-sensitive tool navigation; unavailable tools are explicitly marked |
| Content Studio V2 | `routes/studio-{posts,new,post}.tsx`, `lib/studio.server.ts`, `studio-model.ts` | Posts/events, search/filter/pagination, working revisions, preview, direct publication, unpublish, archive, restricted delete and revision restoration; no approval queue |
| Scheduling | `lib/studio.server.ts::studioSweep`, `workers/app.ts::scheduled` | Toronto quarter-hour input/DST handling, bounded/idempotent role-checked Cron; production Cron not activated or certified |
| Media | `routes/studio-library.tsx`, `routes/studio-media.ts`, shared picker/upload and media services | Private reusable library, metadata, usage references, rights/expiry checks, recoverable trash/restore and guarded derivative delivery |
| Curated public content | `routes/studio-collection.tsx`, `routes/gallery.tsx`, public homepage/About loaders | Homepage slides, banners, Gallery and two About Memories slots are managed through existing Studio collections |
| Permissions/privacy | `requireStaff`, `requireStaffAction`, exact live references, immutable history and optimistic concurrency in Studio | Active role is reread from database; public loaders exclude private/future revisions; no public report/whitelist serialization |
| Safety | Typed approved policy plus three-section route | Private Discord reporting is the approved workflow; no ticket system is needed |

Tests supporting these findings include `staff-auth.test.mjs`,
`oauth-provider.test.mjs`, `oauth-diagnostics.test.mjs`, `studio-v2.test.mjs`,
`studio-v2-ui.test.mjs`, `studio-library-ui.test.mjs`,
`studio-migration-upgrade.test.mjs`, About Memories suites, public V3/UI tests,
and the three built-route/Worker suites above. Historical legacy approval helpers
and unregistered editor files are compatibility code, not a second active
publishing workflow. Do not infer a missing editor from their presence.

## 2. Partially implemented

| Area | What exists | Remaining work or owner decision |
| --- | --- | --- |
| Staff administration | Moderator/Administrator/Owner roles, active flag, guarded bootstrap, session role enforcement and database records | No registered staff-directory/role-management page or action; owner-facing account/role lifecycle needs scoped development if desired |
| Staff profiles / directory | `dashboard-tools.ts` names Staff Profiles without an href | No exposed editing or public directory route. Agree public fields, consent, role visibility and publishing authority before implementing |
| Staff Voices | `content/staff-voices.server.ts` projects only consented public fields, and `components/staff-voices.tsx` hides an empty list | Actual contribution list is empty; genuine supplied content/consent is missing. This curated quote feature is not a staff directory |
| Activity History | Studio audit records and immutable per-document revision history exist (`studioHistory` returns up to 30 revisions) | General Activity History tool has no href; no full administrative viewer/search UI. Existing content audits do not imply community moderation records exist |
| Account experience | Discord-backed account view is functional | No editable independent community profile, Minecraft linking or account-preference controls. Decide if any are launch requirements; avoid duplicating Discord identity without need |
| Gallery workflow | Staff can curate/publish/reuse library assets and credit creators | No registered member self-submission workflow. Collection/permission gathering remains staff-led unless owner requests another model |
| Operational readiness | Local config, migrations through 0013, test fixtures and handoffs exist | Actual role sign-ins, content rights/quality, browser/device accessibility and approved production configuration still need release QA |

## 3. Planned but not started

Verified against registered routes (`app/routes.ts`) and the unavailable tool
entries in `app/lib/dashboard-tools.ts`, rather than inferred from old handoffs:

- **Settings management:** an unavailable navigation item, no Settings route or
  server actions. Current configuration remains code/environment based.
- **Role-assignment/admin interface:** no registered UI/API. Existing bootstrap
  and role checks are implemented; a safe operational management workflow is not.
- **Staff Profiles management/public directory:** no route or content-management
  implementation. The tool's old wording about approvals does not establish an
  approved workflow and must not reintroduce Content Studio publication gates.
- **General Activity History viewer:** no registered read-only administrative
  viewer. Underlying content history is already implemented.
- **Coordinated final public design pass:** deliberately deferred, not a defect
  to fix while functionality remains under development.

No standalone robots/sitemap artifact was found under `public/` and no matching
route in the registry. Indexing/canonical/search metadata requirements should be
reviewed for launch; no SEO system is claimed implemented from page titles alone.

## 4. Optional future enhancements

These are not prerequisites without an explicit owner decision:

- Member profiles/preferences, Minecraft account linking or self-service Gallery
  submissions. Each needs privacy, identity and abuse-handling scope first.
- Games/server CMS editing; current typed catalogs intentionally avoid a new CMS
  or database. Player monitoring and Discord activity tracking remain out of scope.
- Media derivative/format optimizations after realistic measurements with genuine
  source imagery; image enlargement cannot recover missing detail.
- Background orphan-object cleanup or permanent media purge, only after a reviewed
  inventory, retention and backup/recovery policy. No automatic deletion now.
- Legacy-source archival after compatibility evidence; no bulk removal merely to
  make the repository appear tidier.
- Richer dashboards or analytics if justified by actual needs. No invented counts.

Ticketing, public moderation case histories, an independent Owner-review service
and automatic sanctions are not next-phase requirements. Safety intentionally
uses the approved private Discord process; preserve those private boundaries.

## Prioritized proposal: Phase 7 - Staff administration and directory readiness

**Proposal only.** Review and approve the permission/content scope before coding.
This is a functional completion phase, not the coordinated visual redesign.

### P0: Verify the operating workflow and agree scope

Perform owner-led local sign-ins for member, Moderator, Administrator and Owner
at the configured canonical origin; test denial, CSRF, logout and role revocation.
The current generic Vite session may display Login while auth is unconfigured:
HTTP 200 is not proof that OAuth works. Confirm the intended `content_dev` bindings
and callback origin without printing/copying secrets or changing persistent data.
The production configuration has no approved live D1/R2 bindings; local success
does not authorize creating them.

Decide whether staff lifecycle management and a public directory are required
before the final design pass. Approve who may list private accounts, assign roles,
deactivate/reactivate staff and publish each public profile field. Decide whether
staff opt in individually and whether a profile is distinct from a Staff Voice.
No new schema or migration should be applied without separate review.

### P1: Private staff administration (recommended first implementation slice)

Build a compact protected interface over approved account/role operations, reusing
existing authentication and database enforcement. Proposed safety criteria for
owner approval: Owner-controlled role changes; confirmation and audit for changes;
protection against accidental removal of the last active Owner and unauthorized
self-escalation; current-role checks inside each mutation; conflict handling;
immediate denial after deactivation. Do not conflate staff deactivation with
deleting a member account. Read-only account data must remain minimized/private.

Acceptance: anonymous/member/Moderator denied to management; exact Administrator
powers approved explicitly; Owner changes work with immutable attribution;
CSRF/conflict and simultaneous-owner-change tests pass; no private identifiers,
roles or audit fields leak through public loaders. This is a proposed matrix,
not a claim about an already shipped role-management tool.

### P2: Consent-controlled staff profiles, if owner wants them

Define a separate explicit public projection for supplied display name, optional
role, bio/quote and portrait consent. Private Discord IDs, login records, evidence,
internal notes and report records never become directory payloads. Decide editing,
publication and withdrawal behaviour before adding data fields/routes. Reuse the
existing guarded media model where compatible; do not assume a private image
can become public through a new URL. Staff Voices can remain curated and hidden
until real contributions exist, independent of a directory.

Acceptance: opt-out/revocation/empty-state behaviour, private/public field
isolation and media authorization tests; no fabricated staff entries. Only
functional layouts needed for review, with final public styling deferred.

### P3: Administrative history visibility and launch completion

Consider a bounded read-only viewer over existing content/admin audit evidence
once permissions, redaction and retention are approved. It should not invent
community moderation history. Settings editing is separate; avoid an unrestricted
configuration/secrets editor as a shortcut.

Before calling functionality complete, owner decides any essential member-account
or submission capabilities. Then complete real-media publishing, accessibility,
source-image quality and permissions QA. Advanced optional capabilities should
not indefinitely delay the coordinated design pass.

## Launch requirements remain separate approval gates

- Genuine Discord credentials/callback origins and real per-role session QA.
- Approved production bindings, additive migration review, backup/recovery plan,
  secrets handling, domain/canonical configuration and deployment/rollback plan.
- Deliberate remote Cron activation and verification only when authorized.
- Genuine content, creator rights/consent, server screenshots if available, and
  verified modpack/components before publishing exact requirements.
- Owner-approved privacy/account-data wording and operational retention/contact
  decisions; this audit does not prescribe legal obligations or invent policies.
- Review indexing/metadata, noindex boundaries, realistic performance and image
  transfer sizes, physical mobile devices, keyboard and screen-reader behaviour.
- Preserve the separate live teaser until an explicitly approved cutover.

## Deferred coordinated public design pass

All Phase 6 pages are content/functionality/structure approved, **not visually
finalized**. After essential functionality is complete, review the entire public
site together: shared identity, page and section flow, typography/spacing,
composition, personality/originality, responsive behaviour, accessibility/motion
and site-wide navigation consistency. Preserve official branding and safety/
privacy constraints. No cosmetic redesign was performed in this audit.

## Owner review requested

Approve or narrow P0/P1 first; decide whether public profiles/directory (P2) and
administrative history (P3) are needed before final design. Confirm the permission
matrix and public consent fields before implementation. No next-phase code,
database changes or production actions have begun.
