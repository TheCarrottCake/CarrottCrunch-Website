# Games: original CSS visual redesign

Implemented November 10, 2026 (America/Toronto), locally on
`feature/cinematic-redesign-v3` at the existing Phase 5B baseline `898cd5a`.
All maintenance, Servers and Games source work remains uncommitted.

## Current design

Third-party game images/logos are no longer used by Games. The owner chose
original CSS genre compositions with ordinary site typography. These are
intentional graphics, not unavailable-artwork placeholders or traced game assets.

| Game | Original graphic treatment |
| --- | --- |
| Minecraft | Sage graph-paper grid and stacked building forms |
| R.E.P.O. | Cocoa surface, industrial stripe edge and cargo straps |
| Phasmophobia | Static signal rings and two small signal points; no live monitoring |
| Overwatch | Burnt-orange surface with independent diagonal team-play bands |
| Roblox | Soft modular rectangles, circles and capsule shapes; no tilted-square logo or avatar |
| Satisfactory | Warm mechanical grid, parcels and dotted conveyor tracks |

The game title is the card's single visible semantic H3, rather than a duplicate
image caption and title. Original decorations are `aria-hidden` and ignore pointer
input. Body copy and genre labels are unchanged. Cards remain informational:
only Minecraft has a hosted Create link, and other cards do not become fake
buttons or extra keyboard tab stops. Names, all six descriptions, genres and
hosted-server distinctions remain intact.

Directory cards use three columns on desktop, two at tablet width and one on
mobile. The homepage uses the same component in a compact form. Its three picks
remain Minecraft, R.E.P.O. and Phasmophobia. Section **03** stays immediately after
The Hangout; Gallery/News remain **04/05**, followed by Create and the closing
Discord invitation. Existing anchors and shared navigation are preserved.

Fine-pointer hover lifts cards by four pixels with a small motif shift. The real
Minecraft link has a visible focus outline, and its card has a focus-within ring.
Reduced motion removes transitions and hover movement while preserving the
static compact composition scale. There is no automatic animation or activity
simulation. Title/surface colours use Apricot Glow, cocoa, burnt orange and sage
semantic variables; supporting orange is decoration, not small light-surface text.

## Architecture and retirement

- `app/content/games.ts` is still the typed catalog. A `GameTheme` replaces asset
  references; it contains no image URL, publisher logo, licence or permission gate.
- `app/components/game-card.tsx` now renders typography and original CSS geometry.
  It no longer needs image state, download/error handling or artwork hooks.
- `app/games.css` is scoped to explicit public V3 Games classes. It imports no
  fonts, images or other external resources and defines no continuous animation.
- Removed Games-only credits mounts from the homepage and directory. Unrelated
  homepage banner credit/source rendering, gallery rights and all other existing
  media/publication safeguards are unchanged.
- Retired the third-party game files and public rights manifest from
  `public/game-assets/`, the reviewed-asset TS module, credits component and
  manifest generator. Removed obsolete artwork-search/rights reports.
- The prior Games-only material is retained only in ignored local review storage
  `.wrangler/games-css-before/`, outside application/public source. No private
  database or media storage was copied or modified. Earlier original SVG concepts
  remain unused historical source; no Games component references them.

Historical phase handoffs retain their milestone record, with a current-status
note pointing here. The living status no longer treats artwork searches or
publisher permissions as an upcoming Games task.

## Verification

- **144/144 full regression tests pass**. Eight Games tests now cover the
  original CSS catalog, preserved content and Section 03 ordering, hosted-server
  distinction, hidden decoration/semantic titles, real navigation, absence of
  external imagery/obsolete legal UI, and preservation of unrelated credits.
  Superseded Games asset-licensing/image-failure tests were replaced because the
  runtime no longer loads those assets; auth, media and publishing tests remain.
- Typecheck, production build, built-route checks, current V2 Worker/Cron and
  About Memories Worker suites pass. `git diff --check` passes.
- Installed Edge/browser checks at **1440, 1024, 760, 390 and 320px** pass:
  six directory cards and three preview cards, exact homepage order/numbering,
  one H1, no Games image/logo/canvas elements or copyright blocks, no horizontal
  overflow, and title text contained within its graphic panel.
- All title/base-surface contrast measurements exceed 4.5:1. Desktop hover
  elevation, visible link/card focus, hosted-link keyboard navigation, route
  main-focus transfer and tablet/mobile menu Escape/focus return pass.
- Reduced-motion browser emulation confirms no card hover translation and zero
  transition duration on cards and motifs. The mobile preview was tightened
  after measurement and stays below 650px at all requested widths.
- Desktop/mobile screenshots were visually inspected. Updated local evidence:
  `.wrangler/games-css-review/games-1440.png`, `games-390.png`, `games-320.png`,
  `home-1440.png`, `home-390.png`, `home-320.png` and browser script.

Browser review uses the existing built Worker with disposable D1/R2 and synthetic
staff fixtures; it does not access persistent published media. External
fonts/Discord are blocked in QA. Physical mobile devices, screen readers,
real authenticated navigation and owner visual review remain manual.

No dependencies, migrations, persistent D1/R2 writes, production/teaser changes,
commits, pushes, merges or deployments. Official branding, cinematic slideshow,
About, Servers privacy and Content Studio V2 remain untouched by this redesign.
