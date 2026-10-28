# V3 Phase 4: polish and quality assurance

Completed locally on `feature/cinematic-redesign-v3`, based on
`6f81509cd18e447404f1bdf5f6689a174c6dd638`. Phase 1–3 work remains uncommitted and
preserved. No commit, push, merge, deployment, schema change, persistent database
migration or Content Studio workflow change was made.

## Protection and scope

The existing Phase 4 checkpoint was inspected: all 21 recorded source hashes
matched the starting tree. A fresh source-only snapshot is retained in ignored
`.wrangler/checkpoints/v3-phase4-qa-start-20261027/`, including a 24-file manifest
and tracked diff. It contains source, tests and documentation, not credentials,
environment files, database/R2 state, generated types or build artifacts.
The pre-existing `AGENTS.md.backup` is untouched.

The review covered Home, Community, Servers, Gallery, Updates, announcement
details, About, Safety, Join, Login and Account. The approved design remains:
cinematic homepage, image-free editorial introductions, image-first gallery,
readable articles, cocoa server feature and restrained light account surfaces.
Standalone Join/Login intentionally keep their simpler existing shell. The
shared navigation/footer implementations and official SVG retain their design.

## Verified issues resolved

1. **Uncontrolled single-image animation.** A single slide had no pause controls
   but still zoomed for 12 seconds. Single-image showcases now remain static;
   multiple-slide zoom, crossfade and pause behaviour remain available.
2. **Short-screen menu clipping.** At 390×500 the mobile menu extended to 518px
   without scrolling. Its public-only open state now fits the remaining viewport
   and scrolls, including account disclosure contents.
3. **Focus obscured by the mobile menu.** Tabbing beyond the final navigation link
   could focus the hero CTA while the menu remained over it. Leaving the header
   now dismisses the menu. Moving focus inside it keeps it open; Escape still
   returns focus correctly.
4. **Misleading loading counter.** An undecoded image showed `0 / N`. It now shows
   a dash until an actual slide is displayed; live-region loading text remains.
5. **Unnecessary initial image fade.** The first decoded hero image had the same
   1.2-second opacity transition as slide changes. It now appears immediately;
   only transitions between loaded photographs crossfade, retaining the previous
   visible layer throughout.
6. **Homepage banner layout shift.** Public banners omitted available dimensions,
   and the existing automatic-width CSS still collapsed them to 0×0 before
   download when attributes alone were supplied. The presentation DTO now carries
   existing width/height, and the image reserves its display width using the
   existing 240px preview-height cap. Its loaded size, aspect ratio and responsive
   limit remain intact. Browser measurements were identical before/after load:
   approximately 428.89×239.98px on desktop and 285×159.47px on mobile.

## Files changed in Phase 4

- `app/components/community-hero.tsx`: motion, counter and first-reveal state.
- `app/components/community.tsx`: public header opt-in class and focus dismissal.
- `app/public-v3.css`: public menu viewport bounds and conditional crossfade.
- `app/lib/public-content.server.ts`: banner presentation dimensions only.
- `app/routes/home.tsx`: reserve banner dimensions/display width and async decode.
- `tests/community-hero.test.mjs`: single-image motion, loading counter,
  first-reveal/crossfade, background-tab pause and manual/automatic announcements.
- `tests/navigation.test.mjs`: focus-within versus leaving-header dismissal.
- `tests/public-editorial.test.mjs`: banner dimension rendering.
- This handoff.

No gallery records, image bytes, R2 delivery, publication services, permissions,
OAuth/session logic, schemas, packages or public route definitions were changed.
The remainder of the homepage from the Community section onward is unchanged.

## Validation results

- **122/122 automated tests passed** in the final full regression run, including
  V2, branding, authentication, CSRF, concurrency, public content isolation,
  revision/media permissions and scheduled publishing.
- Final `npm run typecheck` and `npm run build` passed.
- `tests/control-build.mjs` passed built-route checks with isolated data and
  mocked OAuth, including role guards, CSRF and private/draft isolation.
- `tests/studio-v2-worker.mjs` passed isolated workerd/Cron, publication, reuse,
  unpublish and upload checks. Existing persistent D1/R2 data was preserved.
- `git diff --check` passed. Generated files remain in ignored locations.
- Headless Edge checked **all eleven views at 1440, 1024, 760, 390 and 320px**.
  All fit without horizontal overflow, with one H1, no skipped heading levels in
  the inspected content and named links/buttons.
- Keyboard checks passed for the skip link, mobile-menu Escape/focus, Tab leaving
  navigation, signed-in account ArrowDown/Escape, route focus, events-anchor
  clearance, and footer reachability. A 390×500 viewport exercised menu scrolling.
- The browser accessibility tree exposed named main/banner/navigation/footer
  landmarks on desktop and a named modal dialog. The collapsed mobile navigation
  is correctly absent from the accessibility tree until opened.
- Hero checks passed for seven-second rotation, pause/resume, hover/focus pauses,
  reduced motion, normal-preference single-image stillness, loaded crossfade,
  slow/broken/empty states and long credits.
- Viewer checks passed for contained authorized derivatives, initial Close focus,
  Source/Tab/Shift+Tab containment, Escape/trigger focus return, scroll/gutter
  restoration and a failed-image alert. It never requests originals.

Browser tests use the actual components with explicitly labelled local content,
mock member accounts and copies of previously verified published derivatives.
They do not publish data or exercise real Discord credentials. Server-side
security and delivery behaviour are checked separately by the regression suites.

## Accessibility and contrast

No new colours or accessibility variants were added. Existing semantic tokens
remain: primary/muted text, burnt-orange actions, sage labels and contextual sage
on cocoa. Text contrast calculations remain approximately:

- Primary text on cream: 12.35:1; muted: 6.03:1.
- Sage labels on cream: 5.55:1; orange on cream: 4.67:1.
- Cream text on cocoa: 12.53:1; contextual sage: 7.40:1.

Source-pixel/overlay samples over existing daylight/sunset images at desktop and
mobile were at least approximately 8.54:1 for cream hero text and 4.41:1 for the
large bold orange word (above its 3:1 large-text requirement). Sampling is not a
guarantee for every future uploaded image. Required image credits remain visible
or keyboard-scrollable; gallery creator credits and licence links are preserved.
Login messages, disabled actions and unpublished-content notices remain visible.

This is a browser/DOM/accessibility-tree review, not a screen-reader certification.
Physical-device and assistive-technology checks remain below.

## Performance observations

- The initial hero requests one eager, high-priority image with dimensions.
  React SSR can emit its image preload. First-image display no longer waits on a
  crossfade. Only the next image is prefetched, at low priority, after the current
  image is ready; the full collection is not preloaded.
- At most two photograph layers render. Animation changes transform/opacity,
  while headline/actions remain stationary. Timers/listeners clean up; hidden
  tabs, reduced motion and interaction stop automatic movement. React does not
  rerender on every animation frame.
- Gallery/card images and the below-fold Discord iframe retain lazy loading and
  image dimensions. Banners now reserve their existing display geometry.
- The inspected published images are **831×465/466**, below the 1280px detail cap.
  They visibly soften at desktop width. Their PNG files are approximately
  **716–840kB each**, so image transfer is a more significant concern than the
  homepage component chunk (approximately **5.8kB gzip**). Public V3 CSS is about
  **4.1kB gzip**, and existing root CSS about **14.2kB gzip**. These are individual
  assets, not the total page transfer budget.
- Public images intentionally remain `no-store`, with exact live-release,
  permission/expiry and byte-integrity checks. Viewer revisits or image changes
  can therefore request bytes again. Caching was not weakened for a speed score.
- The hero photograph or headline can be an LCP candidate. The browser fixtures
  stub backend transport and external fonts/widget traffic, so no production
  LCP, CLS, INP or Lighthouse score is claimed. Real-device/network measurement
  remains necessary, including font swapping and actual request latency.

A separate media-performance proposal could evaluate smaller encoded derivatives
and higher-resolution source uploads, retaining immutable release binding and
revocation guarantees. Increasing a derivative cap alone cannot improve an 831px
source. No pipeline changes were made in Phase 4.

## Screenshots

Desktop/mobile captures for all eleven views are retained outside Git in
`.wrangler/v3-phase4-review/`. Representative files:

- `home-1440.png`, `home-390.png`
- `community-1440.png`, `servers-1440.png`
- `gallery-1440.png`, `gallery-390.png`
- `updates-1440.png`, `updates-390.png`
- `article-1440.png`, `article-390.png`
- `login-1440.png`, `account-390.png`, `join-390.png`

The screenshot fixtures label illustrative content rather than presenting it as
real news, users or attribution. Existing published imagery is reused unchanged.

## Remaining sign-off checklist and readiness

Implementation and automated/browser QA are complete for this phase. Before
launch approval:

1. Check NVDA/VoiceOver/TalkBack announcements, virtual-cursor order, live-region
   behaviour and native-dialog focus on physical browsers/devices.
2. Check iOS/Android touch, landscape, browser text zoom/200% zoom and the
   scrollable menu with real member account names.
3. Verify the real invitation, Discord OAuth/callback, member/staff sign-out and
   third-party widget in the intended environment; local checks use mocks.
4. Approve About's flagged legacy logo wording and Gallery's old concept-art
   empty-state sentence. Community history, staff perspectives, policies,
   connection details and advanced profiles remain intentionally unfinished.
5. Review actual published imagery, credit/licence sources and desktop crops;
   confirm permission expiry/revocation presentation with authorized test assets.
6. Measure field-like Web Vitals and mobile transfer under realistic latency,
   fonts, image sizes and guarded delivery before deciding on media optimization.

No remaining implementation blocker was found within the reviewed scope.
Editorial, real-authentication, physical-device and field-performance sign-off
remain open. Phase 4 stops here; the separate teaser and production resources
were not touched.
