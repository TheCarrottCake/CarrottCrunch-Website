# CarrottCrunch project status

Updated November 11, 2026 (America/Toronto).

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
