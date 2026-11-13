# Phase 7 and Content Studio V3 development checkpoint

November 12, 2026 (America/Toronto). Repository: `TheCarrottCake/CarrottCrunch-Website`.
Branch: `feature/cinematic-redesign-v3`. Development checkpoint only; no launch,
merge to main, deployment, production resource change or migration activation.
The owner explicitly authorized committing this reviewed scope and a normal
push after validation and deployment-trigger review.

## Scope

- Existing local Phase 6/November maintenance commit `f556f0c` follows remote
  `898cd5a`; both are preserved. The normal branch push also includes that
  previously unpushed, documented Phase 6 checkpoint.
- [Phase 7A](phase7a-staff-administration.md): Owner-only staff access changes,
  Administrator read-only roster, private history, CAS, atomic audit and session
  invalidation, using existing tables.
- [Proposed Phase 7B](phase7b-public-staff-directory.md): own private draft,
  field-specific consent, Administrator/Owner publication and exact public
  portrait projection. **Schema gated and inactive on persistent D1** pending
  separate owner approval/application of proposed 0014. SQL stays under
  `docs/proposed-migrations/`, outside active migrations. Disposable-test schema
  application does not authorize persistent or production application.
- [Historical images](historical-server-photo-review.md): two optimized tree
  settlement display copies and honest historical-only Servers Hub context;
  raw collection blocked in development/preview, excluded from generated output
  and ignored by Git. About/Gallery candidate imports remain proposals.
- [About Memories](about-memories-collage.md) and [V3 collections](content-studio-v3.md):
  ordered collection editing, legacy-revision compatibility, featured/story
  placements, shared item/cover dialogs, multi-selection and compact icon controls.
- [Update and Schedule Update](studio-update-scheduling.md): explicit live/private/
  scheduled revision feedback, direct updates through existing services and
  existing schedule-cancellation safeguards; independent schedules stay deferred.
- [Shared editor rollout](studio-shared-editors-rollout.md): Homepage, Gallery
  and global Media Library metadata, keeping placement edits separate from global
  metadata and explicit collection publication.
- [Dialog usability](studio-dialog-usability.md): fixed header/footer, one scroll
  region, mobile visual-viewport/safe-area handling, optional metadata disclosures,
  validation reveal, preserved input and nested-picker Escape isolation.
- Relevant tests, photo inventory/exclusion tombstones, review tooling and handoffs.
  Earlier handoffs retain their original implementation-time statements; this
  checkpoint and the living project status supersede their uncommitted status.

## Exclusions and privacy

No environment/secrets files, D1/R2 state, credentials, generated types/builds,
dependencies, local backups, browser fixtures or private review screenshots are
part of the checkpoint. `AGENTS.md.backup` and the six unused game-placeholder
SVG concepts remain untracked and preserved. No force-add is used.

The raw historical folder remains ignored and unserved. No raw-source or excluded
portrait hash occurs in the tracked/candidate images or generated client image
output. The two selected optimized copies match the reviewed asset manifest.
Joel's removed portrait is not included; the source exclusion tombstone contains
only its filename/hash and removal reason. No external private backup path or
portrait pixels are included. Existing private source originals are preserved.

Tracked files and new checkpoint candidates were scanned for private-key blocks,
GitHub/Discord/AWS token patterns and credential-bearing URLs, with values never
logged. The only scanner finding was an unchanged negative URL-parser test using
an intentionally invalid Discord URL; it was reviewed as test data. Exact staged
paths/content are reviewed before commit, including binary allowlists. This is a
focused review, not a claim that pattern scanning can prove absence of every secret.

## Verification

- Complete regression suite: **173 passed**, no failures/skips.
- `npm.cmd run typecheck` and `npm.cmd run build` pass from `website/`.
- Current built-route/authentication, Studio V2 Worker/Cron, About Memories Worker,
  Staff Management Worker and Staff Profiles Worker checks pass against disposable
  databases/media. Intentional CSRF rejection diagnostics are expected.
- Historical-photo privacy regressions and generated-build hash inspection pass.
- `git diff --check` and exact staged-diff checks pass.
- Prior authenticated isolated Edge review of shared dialogs passed at 1440,
  1024, 760, 390 and 320px, including scrolled chrome, optional-field retention,
  validation, long-error wrapping, rights warnings, focus, nested picker and
  local/global save behavior. Private screenshots are linked from the handoffs
  but are deliberately absent from Git.
- Read-only persistent D1 inspection still ends at `0013_about_memories.sql`;
  none of the proposed profile tables exists. No persistent D1/R2 writes,
  migrations, resets or seeds were performed.

## Git and automation review

Fetched origin references before staging: no divergence; remote development
branch is `898cd5a`, local `f556f0c` is one commit ahead. Local/remote main and
production configuration are not changed by this checkpoint.

Read-only GitHub checks found zero Actions workflows/runs, zero repository
webhooks, no configured Pages site and no deployment records. No workflow files
exist on either remote main or the development branch, and no active local Git
hooks are configured. No repository-driven automatic deployment trigger was found.
Only a normal push to the development branch is authorized; no force push,
main update, automatic merge, Cloudflare command or migration is part of it.

Validation logs, reviewed manifests and automation/privacy results remain ignored
under `.wrangler/checkpoint-review/`. The final commit hashes and push verification
are reported separately after the authorized Git operations complete.

## Outstanding review

Proposed 0014 still needs explicit approval before persistent application. Staff
Profiles/Directory must not be presented as activated. Occurrence-aware inline
attachment editors, independent schedules, licensed historical-content import,
real Discord-role sessions, physical keyboards/touch devices and screen readers
retain their documented follow-ups. The final site-wide design consistency pass
is deliberately reserved for later.
