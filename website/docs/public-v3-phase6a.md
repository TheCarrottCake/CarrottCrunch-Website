# Public V3 Phase 6A: Multi-Game Servers Hub

Implemented locally November 10, 2026 (America/Toronto) in
`C:\Projects\CarrottCrunch-Website`, on `feature/cinematic-redesign-v3` from
Phase 5B checkpoint `898cd5a`. November maintenance updates are preserved;
all Phase 6A work remains uncommitted for visual review.

## Experience and architecture

- `/servers` now uses a dedicated V3 editorial hub: broad gaming-community
  introduction, featured server, cropped workshop artwork and Discord path.
- `/servers/create` adds creative-engineering ideas, private onboarding, structured
  requirements, established expectations, Safety/gallery links and an honest
  server-moments placeholder. Breadcrumb and closing links return to the hub.
- `app/content/servers.ts` defines the code-configured, typed catalog: identifier,
  slug, game, display name, description, optional image, visibility, explicit
  owner approval, availability/access category and featured status. Details links
  are derived from validated slugs. Availability never represents live status.
- `publicServers()` publishes only approved, visible entries, explicitly projects
  public fields and sorts featured entries first. The only catalog entry is
  **Carrott's Create Server**. Unconfirmed game/server ideas have no entries,
  teaser cards, routes or coming-soon claims.
- `ServerCard` is game-neutral; `ServerArtwork` shares safe imagery, captions,
  required-credit text and unavailable/error fallback. Local repository imagery
  and existing guarded public release detail URLs are supported. No original,
  private preview, external source or arbitrary transformation URL is accepted.
- New styling is isolated in `app/servers.css`, using semantic Apricot Glow,
  cocoa, burnt-orange and Leaf Sage tokens. New component classes have the
  `v3-server-` prefix to avoid legacy homepage `.server-card` styles. No existing
  homepage CSS was edited. Images use centred `object-fit: cover`, filling their
  frame edge-to-edge; captions/credit remain outside the cropped image.

The shared public layout, navigation, auth loader, focus management and footer
are reused. Existing NavLink prefix matching keeps Servers active on the child
route without a shared-header change. No database, migration, API, CMS
collection, dependency, admin workflow or publication queue was introduced.

## Content, imagery and privacy

Public onboarding is: join Discord, request server access, follow authorized
staff's private Tailscale/whitelist instructions, then install the confirmed
modpack/components. Discord membership does not automatically grant access.
There are no connection buttons, public IP fields, tailnet identifiers,
credentials, whitelist records, fabricated player counts or online statistics.
Neither new route has a loader or reads private environment/D1/R2 data.

Requirements state Minecraft Java and modded Create context. Exact game/modpack
versions and required components are deliberately **not published** until
confirmed by authorized staff. Gameplay copy describes creative possibilities,
not an inventory of installed extras or claims of completed community projects.
Expectations use only the supplied respectful-behaviour, no-griefing,
lag-conscious building and consideration guidance; there are no invented
penalties or moderation procedures.

No real, authorized Create Server screenshots are configured in source. The
existing `create-workshop-placeholder.svg` is reused unchanged and labelled as
an illustration, never a community screenshot. The moments section explicitly
reserves space for genuine approved images. No private Library images, original
R2 objects or persistent media were accessed or copied. Future public-release
URLs retain existing delivery rights/revocation checks; this page does not bypass
them. Missing or revoked images fall back rather than exposing an original.

Official CarrottCrunch SVGs, TCC artwork, cinematic homepage, approved About copy,
Staff Voices, Content Studio and all publication/auth safeguards are untouched.

## Adding another confirmed server

1. Obtain owner approval for the exact public server facts and imagery/credits.
   Do not put private addresses, staff setup instructions or secrets in catalog
   source, even in hidden entries: source is not private storage.
2. Add a typed catalog entry with a unique ID and slug, game-neutral name/copy,
   access category and featured setting. Keep it hidden/unapproved until ready.
3. Add its explicit detail route and content before enabling the public entry.
   A catalog entry does not automatically create a route. Keep the shared main
   navigation pointing to `/servers`.
4. Choose approved repository art or an existing guarded public detail image,
   descriptive alt text, honest caption and mandatory attribution. Never use a
   private preview or original URL. Rights/expiry remain enforced by delivery.
5. Test visibility, route linking, public-data projection, imagery/fallback,
   access wording, mobile/keyboard use and current regressions before review.

## Source files

Added:

- `app/content/servers.ts`
- `app/components/server-card.tsx`
- `app/routes/servers-create.tsx`
- `app/servers.css`
- `tests/servers.test.mjs`
- `docs/public-v3-phase6a.md`

Updated: `app/routes/servers.tsx`, `app/routes.ts`,
`tests/fixtures/studio-build-check.mjs`, and `docs/project-status.md`.
These are separate from the preserved uncommitted November maintenance files.

## Verification

- Full regression suite: **136/136 pass**, including six new Phase 6A tests.
- `npm.cmd run typecheck` and `npm.cmd run build`: pass.
- Built-route checks (`tests/control-build.mjs`): pass, including registration
  of both server routes and absence of private-data loaders.
- Current `tests/studio-v2-worker.mjs` and `tests/about-memories-worker.mjs`: pass.
  Cron, role checks, CSRF, media rights, private/live isolation and auth regression
  coverage remain active. Historical pre-V2 standalone harnesses are unchanged.
- `git diff --check`: pass.
- Installed Edge, built Worker and disposable D1/R2 browser review at **1440,
  1024, 760, 390 and 320px**: both routes load directly, no horizontal overflow,
  one H1, active Servers navigation, descriptive images and edge-to-edge cover
  frames. Reviewed desktop/mobile screenshots, then corrected legacy class
  collisions and repeated the viewport checks.
- Browser keyboard review: Tab/Enter, visible focus, hub-to-detail client navigation,
  route main-focus transfer, return link, mobile menu Escape/focus restoration,
  skip link and reduced-motion compatibility pass. No new animation is added.
- Catalog regressions inject hidden/unapproved entries and private-field sentinels
  to verify exclusion; unsafe image URLs and missing imagery are covered.

Browser evidence and fixture scripts are local-only under ignored
`.wrangler/phase6a-review/`; they are not public content or production QA.
The fixture uses synthetic staff data and disposable D1/R2, never persistent
local state. External font/Discord requests are blocked during browser review.
No real authenticated Discord or production environment was tested.

## Remaining manual and editorial review

- Verify the current modpack name/version, Minecraft version and required
  components before adding any exact installation requirements to public copy.
- Supply genuine authorized Create Server screenshots and exact attribution;
  review real-image crops and useful alt text before replacement of placeholders.
- Owner visual/copy review, physical iOS/Android, screen readers and real
  Discord onboarding/access remain manual checks. Browser fixtures cannot
  establish live credentials, network membership or server availability.
- Phase 6B Safety policies/reporting copy still requires owner-approved content.

No persistent D1/R2 writes, migrations, production/teaser changes, commits,
pushes, merges or deployments. `AGENTS.md.backup` remains untouched.


## Visual refinement - November 10, 2026

A local follow-up improves space utilization while retaining all onboarding,
privacy, requirements and imagery safeguards above. No catalog entry, server
claim, route, dependency or publishing behaviour changed.

- Servers pages now use a V3-scoped maximum width of 82rem (previously 77.5rem),
  smaller page-top padding and a 2.5-4rem section rhythm rather than 3.5-6.5rem.
- The hub opening is asymmetrical: headline/copy alongside a restrained CSS
  controller motif. This is abstract decoration, not server imagery or a new
  brand asset. Its compact mobile form remains within the available width.
- The featured server gives more horizontal room to edge-to-edge artwork.
  A compact community strip introduces building, finding a party and hanging
  out, with the existing Discord path. There are no Games-directory links or
  unconfirmed future server announcements.
- Create's hero gives more weight to the image. Fixed axle/rail-like details add
  mechanical personality to gameplay without animation. Onboarding spacing is
  tighter, with all existing access instructions preserved.
- Requirements use compact label/value rows on desktop and stack on mobile.
  Expectations use a sage editorial rule rather than a second equal-height
  card. Both panels size to their content, avoiding empty stretched areas.
- Server Moments is a compact editorial strip with a smaller patterned empty
  frame; it still explicitly states that no server screenshot is published.

Source changes in this follow-up: `app/routes/servers.tsx`, `app/servers.css`,
this handoff and `docs/project-status.md`. The Create route and shared card
source are unchanged; its visual refinement is entirely scoped CSS.

Verification rerun: **136/136 tests pass**, typecheck, production build,
built-route checks, current V2 Worker/Cron and About Memories Worker checks pass.
`git diff --check` passes. Existing headless Edge checks again pass at **1440,
1024, 760, 390 and 320px**, including no horizontal overflow, single H1,
active Servers navigation, full-bleed cover crops, client navigation, main-focus
transfer, Tab/Enter, mobile menu Escape/focus return, skip link and reduced
motion. Desktop and narrow-mobile screenshots were visually inspected.

Updated screenshots remain ignored local review evidence:

- `.wrangler/phase6a-review/hub-1440.png`
- `.wrangler/phase6a-review/create-1440.png`
- `.wrangler/phase6a-review/hub-390.png`
- `.wrangler/phase6a-review/create-390.png`
- `.wrangler/phase6a-review/hub-320.png`
- `.wrangler/phase6a-review/create-320.png`

Browser checks use the same disposable built-Worker fixture; physical devices,
screen readers and real authenticated onboarding remain manual. No persistent
data, homepage, About, Content Studio, official branding or production changes.
All maintenance and Phase 6A work stays uncommitted for visual review.
