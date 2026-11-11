# Public V3 Phase 6A.1: What We're Playing

> Current owner direction, November 10, 2026: Games uses original CSS genre
> compositions and ordinary site typography. The artwork search and Games-only
> credits are retired. Section 03 placement and all six confirmed games remain.
> See [current CSS redesign](games-css-redesign.md). The initial implementation
> notes below are a historical milestone record, not current artwork requirements.

Implemented locally November 10, 2026 (America/Toronto), on
`feature/cinematic-redesign-v3` in `C:\Projects\CarrottCrunch-Website`.
Phase 5B remains the committed baseline `898cd5a`; November maintenance,
Phase 6A and its visual refinements are preserved and uncommitted.

## Experience

`/games` is a community Games directory, distinct from hosted servers. It shows
all six owner-confirmed games: Minecraft, R.E.P.O., Phasmophobia, Overwatch,
Roblox and Satisfactory. Each card has descriptive imagery, a visible placeholder
label, genre labels and short friendly copy. Only Minecraft has a
**CarrottCrunch-hosted Create server** link, pointing to `/servers/create`.
No other title is labelled hosted. Satisfactory has no server promise, launch
announcement, availability label or player/activity metric.

A compact **What We're Playing** section follows all existing homepage sections,
after the Join section. Its Minecraft, R.E.P.O. and Phasmophobia selection is a
presentation choice, never a popularity ranking. Explore All Games links to
`/games`. Desktop uses three shallow image cards; mobile uses compact thumbnail
rows. The browser check caps the section below 650px at every requested width.

The Servers hub has a small **Beyond the Servers** path to `/games`. The featured
Create card, private onboarding and Create detail page are unchanged. Games is
added to the shared public navigation; existing menu/account/focus behavior is
retained. Desktop gaps are reduced, with the existing menu pattern extended to
761-1100px to prevent crowding. The active Games link and mobile Escape behavior
are covered by automated checks.

## Architecture and artwork

- `app/content/games.ts`: typed game catalog, artwork provenance/permission fields,
  optional hosted-server relationship and explicit homepage selection IDs.
- `app/components/game-card.tsx`: shared full/compact card, semantic article/title,
  genre list, responsive cover image, descriptive alt/caption, credit field and
  image-error fallback. Non-hosted games are informational cards, not fake links.
- `app/components/games-preview.tsx`: compact, curated homepage section.
- `app/routes/games.tsx` and route registration in `app/routes.ts`.
- `app/games.css`: namespaced public-only Games styles, loaded at the public layout
  boundary. Existing hero styling is untouched.

No verified third-party game artwork was available in the repository. Six
**original abstract geometric SVG placeholders** were created under
`public/images/games/`. They are not official logos, promotional art, screenshots
or claimed community creations. No third-party image was downloaded, hotlinked
or assumed redistributable. Each catalog artwork record documents the local
source and original-art permission basis, and every image is visibly labelled.
All image frames use `object-fit: cover`; original files remain unchanged by
cropping. Official CarrottCrunch and TCC SVGs are untouched.

To add a confirmed game, expand the typed ID/catalog with approved copy and genres,
then optionally add it to the curated preview IDs. A hosted-server relation must
only be added for an actually confirmed hosted server with an existing detail
route. Before replacing placeholder art, verify the exact asset's usage terms,
redistribution/hosting rights, required attribution and source; record these in
its artwork metadata and include required visible credit. Do not treat a game's
promotional availability or store listing as permission to redistribute assets.
Use only reviewed local assets; no private Library previews or R2 originals.

No loader, database, migration, CMS collection, monitoring, Discord activity
tracking, third-party image requests or dependency was added.

## Preservation and source inventory

The homepage source matches the prior committed source exactly after removing
only the new GamesPreview import and mount. Its hero component, slideshow,
controls, copy, banners and original sections are unchanged. About, Staff Voices,
Content Studio V2, auth services, private access and release safeguards are intact.
Shared layout changes are limited to importing scoped CSS; shared header changes
are limited to adding Games. Existing regression assertions remain in place.

Added: the five Games modules/styles listed above, six SVG placeholders,
`tests/games.test.mjs` and this handoff.

Updated: `app/routes/home.tsx`, `app/routes/servers.tsx`, `app/routes.ts`,
`app/components/community.tsx`, `app/routes/public-layout.tsx`,
`app/public-v3.css`, `app/servers.css`, `tests/fixtures/studio-build-check.mjs`,
`tests/public-v3-foundation.test.mjs` (stylesheet import in its harness),
and `docs/project-status.md`.

## Validation

- Full regression suite: **141/141 tests pass**, including five new Games tests
  for all entries, genre/copy presence, original asset provenance, hosted-server
  distinction, preview selection, public navigation and Servers integration.
- Typecheck and production build pass.
- Built-route checks pass, including `/games` registration and no private loader.
- Current V2 Worker/Cron and About Memories Worker suites pass with disposable
  D1/R2. Existing authentication/publication/security coverage is retained.
- `git diff --check` passes.
- Installed Edge/browser review at **1440, 1024, 760, 390 and 320px**: directory
  and homepage preview render six/three cards respectively, no horizontal overflow,
  image cover crops and accessible descriptions, one H1, active Games navigation,
  reachable tablet/mobile menu and compact preview height.
- Keyboard review passes preview-to-directory and hosted Create navigation,
  visible focus, main-focus transfer, menu Escape/focus return and reduced motion.
  Desktop and mobile screenshots were inspected. The 320px preview was tightened
  after measurement; existing layout test harness now recognizes the scoped CSS
  import without removing assertions.

Ignored local evidence: `.wrangler/games-review/games-1440.png`,
`games-390.png`, `games-320.png`, `preview-1440.png`, `preview-390.png`,
`preview-320.png` and browser script. Browser QA uses the built Worker with
synthetic staff fixtures and disposable D1/R2; it does not access persistent
state, real Discord activity or production. External fonts/Discord are blocked
in browser QA. The owned temporary preview/browser are stopped after review.

## Remaining review

Owner visual/copy review and properly licensed game artwork replacements remain
editorial work. Physical iOS/Android, screen readers, actual licensed artwork
crops and real authenticated member/staff navigation remain manual checks.
Placeholders are intentional, not pending automatic downloads. No new current
server or game activity claims should be inferred from the catalog order.

No persistent data writes, remote resources, teaser/production changes, commits,
pushes, merges or deployments. Leave all changes uncommitted for visual review.
