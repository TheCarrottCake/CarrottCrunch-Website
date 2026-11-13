# CarrottCrunch project status

Updated November 12, 2026 (America/Toronto).

Phases 6A (Servers/Create), 6A.1 (Games) and 6B (Safety) are **content and
functionality/structure approved** for the combined local checkpoint. Public
visual presentation is **not finalized**. The [combined checkpoint report](phase6-final-checkpoint.md)
records the exact 42-file scope and validation. Safety uses the latest
three-section editorial layout; its [handoff](public-v3-phase6b.md) records policy
preservation and browser evidence.

The coordinated public-site design pass is deferred until functionality/content
work is complete. It must address shared visual identity, section-to-section
flow, typography and spacing, page composition, personality/originality,
responsive design, accessibility/motion and navigation consistency. No such
redesign or next-phase implementation is authorized by this checkpoint.

> Development checkpoint: [November 12 scope and verification](development-checkpoint-2026-11.md). Earlier handoffs retain their implementation-time uncommitted statements. Proposed 0014 remains unapplied; final site-wide design is deferred.

## Phase 7A - private staff administration

Implemented locally and uncommitted for review from checkpoint `f556f0c`:
`/control/staff` gives Owner access management/history, Administrator read-only
roster and no Moderator/member access. Reuses existing tables, access versions,
append-only audits and session invalidation; no migration or persistent account
change. All 156 regressions, typecheck/build and current Worker checks pass.
See [Phase 7A handoff](phase7a-staff-administration.md).

Public Staff Directory is confirmed for V1.0. [Phase 7B proposal](phase7b-staff-directory-proposal.md)
has a tested proposed implementation with explicit opt-in/field consent and no
public Discord IDs/account records. Proposed schema 0014 is awaiting owner approval;
no persistent profile tables or data have been created. Staff Voices remains independent. The final
site-wide design consistency pass stays deferred.

## Phase 7B - proposed Public Staff Directory implementation

Own draft/field-specific consent, Administrator/Owner publication, withdrawal,
role/access invalidation and guarded portraits are implemented against disposable
schema and remain uncommitted. `/community/staff` is linked from Community.
All 165 regressions, typecheck/build, applicable built/Worker suites and five-width
browser review pass. See [implementation and migration review](phase7b-public-staff-directory.md).
Persistent D1 still ends at 0013 with zero new profile tables; draft SQL lives
outside active migrations and must not be applied without owner approval. The
real editor/directory remain schema-gated pending that approval/application.

## Historical server photo review

Historical collection reviewed (including 14 GIF frames). Eight unrelated originals
remain unchanged; owner-confirmed Joel portrait was removed to a verified private
backup outside the repository and excluded from future contact sheets/recommendations.
Remaining originals are excluded from public delivery/build and Git because the
collection includes an unconsented real-person portrait and unreviewed artwork. One optimized historical
tree-settlement image is added only as Servers Hub context, explicitly separate
from the current Create server. About/Gallery imports are plans, not persistent
content changes; existing homepage media is retained. All 168 regressions,
typecheck/build, applicable Worker suites and five-width image checks pass.
See [photo inventory, contact sheet and placement plan](historical-server-photo-review.md).

## Source and completed work

- Active checkout: `C:\Projects\CarrottCrunch-Website`, branch
  `feature/cinematic-redesign-v3`. Verified local and remote Phase 5B checkpoint:
  `898cd5a0e86b23a4bc7e1e7ddec1889a21c5a62b`. Phase 5A: `84c62cd`.
- Content Studio V2 is implemented: Posts & Events, shared private Media Library,
  homepage/gallery collections, private/live revisions, direct role-authorized
  publishing, Toronto scheduling, immutable history and independent Worker Cron.
  No publication approval queue is required.
- Public V3 Phases 1-5B are implemented and committed: cinematic homepage,
  responsive public subpages, About writing, curated gallery and About Memories.
  Homepage/gallery retain approved cropped, full-bleed imagery and full-image
  viewing. Official community logo and TCC artwork remain unchanged.
- Discord OAuth, member accounts and protected Crunch Control are implemented.
  Staff Voices renders nothing until genuine contributions and consent exist.

- Phase 6A.1 is implemented in the combined Phase 6 scope: `/games` lists all six
  confirmed community games; a compact three-game homepage preview and public
  Games navigation are in place. Only Minecraft links to our hosted Create server.
  Homepage Games is numbered 03 after The Hangout. All Games cards now use
  original CSS genre compositions and bold site typography, without third-party
  game images/logos or Games-only copyright sections. Names, genres, descriptions
  and hosted-server distinctions are preserved. Artwork searches are retired.
  See the [CSS Games redesign](games-css-redesign.md) and
  [historical Games handoff](public-v3-phase6a1.md).

## Local state and verification

Existing ignored environment files, D1 and R2 are present in this V3 checkout;
none was copied from the older G: checkout. Secrets were not inspected or logged.
The persistent migration ledger ends at `0013_about_memories.sql`, applied
October 27, 2026 at 22:58:01 Toronto time (October 28 at 02:58:01 UTC).
Read-only SQLite quick/foreign-key checks pass. No migrations, reseeding,
resets, persistent media writes or production changes are part of maintenance.

See [November maintenance results](maintenance-2026-11.md) for tooling,
regressions, limitations and the proposed Phase 6 scope. No production deployment,
remote migration, remote Cron activation or teaser change is authorized.

## Known limitations and next milestones

- Real Discord authentication for each role, actual licensed media publishing,
  physical mobile devices and screen readers still need manual verification.
  Automated checks use disposable D1/R2, synthetic assets and fake sessions.
- Real-image source quality, approved crops and measured mobile performance need
  review; derivative enlargement cannot restore missing source detail.
- Phase 6A is implemented in the combined Phase 6 scope: dedicated multi-game Servers
  hub and Create detail page with private onboarding and honest imagery/version
  placeholders. Only Carrott's Create Server is published in the catalog.
  Desktop visual refinement adds a wider, denser hub and more balanced Create
  sections; responsive and keyboard checks pass at all five target widths.
  See [Phase 6A handoff](public-v3-phase6a.md). Safety now has its dedicated Phase 6B editorial page.
  Preserve private Tailscale and whitelist access; publish no network details,
  fabricated status, invented policies or unapproved reporting contacts.
- Pre-V2 standalone publication/media Worker scripts are historical harnesses,
  excluded from current acceptance checks. Keep their assertions for historical
  investigation; use the current V2 and About Memories Worker suites.
- Phase 6A visual/editorial review: verify the exact modpack/game versions and
  required components before publishing them; supply authorized server screenshots.
- Phase 6B is implemented in the combined Phase 6 scope: seven approved community rules,
  Minecraft expectations, private Discord reporting, staff accountability and
  account-safety guidance. No reporting system, permission changes or private
  records are added. All 147 tests, typecheck, build, current built-route and
  Worker/Cron suites pass; browser review passes at all five target widths.
  Coordinated final design review, physical-device and screen-reader checks remain.

Before a source checkpoint, review the diff and intended staged paths, excluding
`AGENTS.md.backup`, secrets, `.wrangler/`, dependencies and generated artifacts.
The combined local commit is authorized after validation and staged-diff review.
No push, merge or deployment is authorized.

## About Memories collage and image controls â€” November 11

About Memories now supports six optional managed positions: legacy `opening` and
`history`, plus `collage1`â€“`collage4`. The opening collage hides unused/failed
images and the smaller story placement remains independent. Visible public
full-image CTAs were removed from homepage, About and Gallery; images retain
keyboard-accessible activation of the existing viewer. Approved About writing,
founder icon, slideshow controls and ongoing Phase 7A/7B work are preserved.
No migration or persistent content/media write was required; 0014 remains pending.
Historical candidates still require creator-rights/attribution review before any
normal Content Studio import/publication. See [implementation and private review
screenshots](about-memories-collage.md). Final site-wide design remains deferred.

## Content Studio V3 visual collections - November 11

About Memories now uses an ordered visual photo collection (up to 100 references,
24 thumbnails initially) instead of six expanded slots. Legacy saved/live slot
revisions remain compatible and are converted only on explicit editing/saving.
Shared accessible item dialogs and compact icons also manage homepage/Gallery
entries and post/event covers. Existing collection-level publication, scheduling,
history, concurrency, rights enforcement and private media delivery remain intact.
Media Library metadata and inline post attachments have a focused follow-up plan.
See [V3 implementation, rollout status and private screenshots](content-studio-v3.md).
No migrations or persistent D1/R2 changes; 0014 remains pending. The earlier
six-slot collage handoff below is implementation history, superseded by this format.

## Content Studio - direct updates and scheduled updates

Live content now exposes Update, Schedule Update and Save Draft in the shared
editor toolbar; Unpublish is under More. Update includes unsaved form edits using
the existing atomic save/publish service. Protected release metadata identifies
working, live and scheduled revisions. Current content stays live while editing,
previewing, privately saving or waiting for Cron. Later draft saves retain V2's
schedule-cancellation safeguard, now explicit in the UI. See [implementation,
verification and screenshots](studio-update-scheduling.md). No migrations or
persistent data changes; existing uncommitted work is retained.

## Shared editors rollout

Homepage/Gallery retain their approved visual managers, with explicit slide
positions and accurate creator/required-credit previews. Media Library now uses
the same accessible V3 dialog for global asset metadata, with explicit scope,
unsaved protection, versioned save errors, pending locks and guarded usage/trash
controls. Shared publication actions and schedule-cancellation safeguards remain.
See [rollout, changed files and before/after screenshots](studio-shared-editors-rollout.md).
No schema or persistent-data changes; 0014 remains pending. Inline post attachment
editing and independent schedules remain separate future work.

## Shared dialog usability - November 12

The shared Studio dialog now keeps its header and action footer visible around
one scrolling content region. Media Library optional metadata uses accessible
disclosures with error reveal and persistent rights warnings. Narrow editors
use near-full viewport dimensions, safe-area padding and visual-viewport sizing.
All four editors passed authenticated isolated five-width browser checks;
nested picker Escape is scoped to the picker. Full regressions (173), typecheck,
build and current built-route/Worker/Cron checks pass. See the
[handoff and before/after screenshots](studio-dialog-usability.md). Physical
keyboards and screen readers remain manual checks. No persistent data changes,
migrations, commits or production changes; proposed 0014 remains unapplied.
