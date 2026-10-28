# V3 Phase 3: public editorial pages

Implemented locally on `feature/cinematic-redesign-v3` from checkpoint commit
`6f81509cd18e447404f1bdf5f6689a174c6dd638`, preserving the uncommitted Phase 1–2.1
baseline. No commit, push, merge or deployment was made.

## Baseline protection

Before editing, 21 source/documentation/test files were copied into ignored
`.wrangler/checkpoints/v3-phase3-before-20261027/source/`, with SHA-256 hashes in
`manifest.json` and a tracked diff in `tracked.patch`. No environment files,
credentials, databases, media storage, dependencies, build output or generated
types were included. The pre-existing `AGENTS.md.backup` remains untouched.

The previous V3 handoffs and actual route/component architecture were reviewed.
No separate architecture-audit file was found in the repository. Source/hash
comparisons confirm that the homepage, prior hero/viewer/helpers, public layout,
Login route logic, public content DTO and content-source copy remain unchanged.
The new CSS is appended after the preserved Phase 1–2.1 stylesheet.

## Design and files

`app/components/public-page.tsx` now exports an image-free `EditorialHeader`
supporting an eyebrow, title, optional orange accent, description and optional
context/actions. It owns the page H1; content sections retain H2/H3 hierarchy.
The existing `PublicPage` now uses numbered editorial rows instead of repeating
cards. It preserves the original section copy, unpublished notices and links.

| Public views | Presentation change |
| --- | --- |
| Community, About | Expressive type, sage labels, open editorial sections; no fabricated history, statistics, testimonials or staff quotes |
| Servers | Compact introduction and one cocoa Minecraft/Create feature; unpublished connection details and disconnected live status remain explicit |
| Safety | Visible, readable invitation and safety guidance; unfinished policy and reporting information remain visible |
| Gallery | Smaller introduction and two-column image-first layout, one column on mobile; full image ratios, featured ordering, creator and required credits remain intact |
| Updates | Editorial header, readable two-column news/events layout and preserved status groups, notices and empty states |
| Announcement detail | Reading-width article, clearer publication metadata, full-ratio imagery and readable Markdown spacing; same renderer and 404 behaviour |
| Join | Light standalone editorial page with official mark and skip link; unchanged invitation loader and unavailable-invitation message |
| Login | Light `AccountShell` presentation with shared editorial header; unchanged OAuth form, loading/disabled state and visible operational messages |
| Account | Restrained identity surface and responsive welcome; same guards, CSRF logout, permissions and unfinished-profile notice |

Changed source files:

- `app/components/public-page.tsx`
- `app/components/account-shell.tsx`
- `app/routes/gallery.tsx`
- `app/routes/updates.tsx`
- `app/routes/news-article.tsx`
- `app/routes/join.tsx`
- `app/routes/account.tsx`
- `app/public-v3.css`

Added `tests/public-editorial.test.mjs` and this handoff. Community/About/Servers/
Safety route modules and `app/content/public-pages.ts` are unchanged; they use
the updated shared presentation. Login's route code is unchanged and uses the
updated AccountShell. Join and AccountShell explicitly import the public CSS
and establish their own `.public-v3` boundary because they are standalone.

All new selectors require `.public-v3` plus a `.v3-*` opt-in. Navigation and
footer implementations are unchanged. No photographic subpage heroes, CMS
banner system, new dependencies, migrations, routes or backend changes were
introduced. Existing public loader/header/metadata blocks were compared with
the pre-edit source and are equivalent.

## Verification

- **120/120 automated tests passed**, including existing V2, branding,
  authentication, public isolation, media and publishing regressions.
- Four new focused tests cover header safety/options, preserved informational
  content/notices, gallery featured/enabled ordering and credits, and newsroom
  empty/error presentation. CSS-isolation and public-layout focus tests pass.
- `npm run typecheck` and `npm run build` passed.
- Built-route checks (`tests/control-build.mjs`) passed, including mocked OAuth,
  authorization, CSRF and private/draft isolation.
- Isolated workerd/Cron checks (`tests/studio-v2-worker.mjs`) passed. Persistent
  local D1/R2 data and production resources were not changed.
- `git diff --check` passed.
- Headless Edge inspected ten views at **1440, 1024, 760, 390 and 320px**: one H1
  per view, no horizontal overflow, preserved visible notices, credits and public
  derivative paths. Keyboard menu Enter/Escape, trigger focus return, route focus
  restoration, visible 3px action focus, events-anchor clearance below sticky
  navigation and reduced-motion button behaviour passed.
- Contrast calculations for the tokens used here: primary text on cream 12.35:1,
  muted text 6.03:1, sage labels 5.55:1, orange 4.67:1; cream on cocoa 12.53:1,
  contextual sage on cocoa 7.40:1. Existing accessible sage variants are reused;
  no new colour variants were introduced.

Browser review uses actual page components with explicitly labelled local
news/account/gallery fixtures, verified copies of existing published image
derivatives, and stubbed backend transport. It does not create public content or
claim to exercise real Discord sign-in. Screenshots are retained outside Git in
`.wrangler/v3-phase3-review/`, including `community-1440.png`,
`servers-1440.png`, `gallery-390.png`, `updates-390.png` and `login-320.png`.

## Remaining editorial and manual checks

- About's old temporary-logo statement is preserved but visibly marked
  **LEGACY WORDING · NEEDS EDITORIAL REVIEW**, with clarification that it predates
  the official artwork. Replace the historical wording only after copy review.
- The existing gallery empty-state copy also references old homepage concept
  artwork. It remains unchanged; review that sentence alongside the About copy.
- Full community history, policies, connection details and advanced profiles
  remain explicitly unfinished. No unsupported content was supplied.
- Test physical iOS/Android devices, browser zoom and a screen reader, including
  the menu, skip links, article headings and long gallery attribution.
- Verify real Discord invitation/OAuth/member sessions in the intended local
  environment. Automated auth tests use mocks; browser fixture Login/Join use
  unavailable states, not live invitations or credentials.
- Review real published gallery/news content, including missing/expired images,
  required source links and featured order. Existing public authorization and
  no-store delivery continue to enforce access independently of presentation.

Phase 3 stops here. Content Studio, gallery data, media permissions, publication
workflows, auth/session behaviour, schemas and the separate teaser are untouched.
