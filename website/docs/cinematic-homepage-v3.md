# V3 Phase 2: cinematic homepage

Implemented locally on `feature/cinematic-redesign-v3`, based on V2 checkpoint
`6f81509cd18e447404f1bdf5f6689a174c6dd638`. Phase 1 changes remain intact and
uncommitted. No commit, deployment, dependency, schema or persistent data change
was made. A source-only pre-edit checkpoint is retained under ignored
`.wrangler/checkpoints/v3-phase2-before-20261027/`.

## Files and integration

- Added `app/components/community-hero.tsx`: one stationary headline/CTA layer
  over the existing published homepage collection.
- Added `app/components/full-image-dialog.tsx`: accessible uncropped viewer.
- Added `app/lib/community-hero.ts`: public slide type, URL filtering and rotation
  helpers.
- Updated `app/routes/home.tsx`: replaces only the introductory hero/showcase;
  retains banners, the original caption, remaining sections, anchors and metadata.
- Updated `app/lib/public-content.server.ts`: adds existing item ID and public
  derivative dimensions to the presentation DTO. Queries and permissions are
  unchanged.
- Extended Phase 1 `app/public-v3.css` with opt-in homepage/viewer styles, and
  `tests/public-v3-foundation.test.mjs` with a namespaced animation allowance.
- Added `tests/community-hero.test.mjs` with seven focused behaviour tests.

The Phase 1 `public-layout.tsx` integration and handoff document are preserved.
The original `community.tsx`, shared navigation, account controls, footer, gallery,
authentication and Content Studio services are unchanged.

## Behaviour

The full-width hero is 650px tall on desktop, with centred `cover` images, a dark
left overlay and a cream lower fade. The original headline, supporting copy and
CTA destinations remain. Burnt-orange “world.” and its hand-drawn underline sit
on a small cream highlight to ensure contrast. The separate sticky navigation
remains Apricot Glow. Empty/error states use the approved palette and official
SVG, without substitute community photography.

Rotation waits for a successfully loaded image, then advances after seven
seconds. At most two rendered image layers crossfade for 1.2 seconds. The zoom
is limited to 1.04 over 12 seconds. Only the next image is prefetched. Hover,
keyboard focus, manual pause, an open viewer and hidden tabs stop automatic
movement. Reduced motion disables autoplay, zoom and animated transitions while
retaining manual previous/next. Timers and listeners are cleaned up.

Failed images are excluded with a retry option when none remain. Slow images
retain the last loaded slide. One-image collections omit cycling controls.
Long titles/descriptions and required credits remain available in a fixed-height,
keyboard-focusable scrolling details area, preventing caption-driven shifts.

The native dialog displays the **same guarded public derivative**, using
`contain`; no original/private endpoint is used. It includes a labelled heading,
initial Close focus, Tab containment, Escape, focus return, preserved required
credit/source, loading and failure feedback. Background scroll is locked with
its scrollbar gutter reserved. A revalidated release change closes the viewer.

## Validation

- All **115 automated tests passed**, including auth/CSRF, concurrency,
  public-isolation, publishing and media regressions.
- `npm run typecheck` and `npm run build` passed.
- `node --experimental-strip-types tests/control-build.mjs` passed built-route
  checks, including mocked OAuth and role isolation.
- `node --experimental-strip-types tests/studio-v2-worker.mjs` passed isolated
  workerd and Cron publication/unpublish checks.
- `git diff --check` passed.
- Headless Edge checked real components and full homepage layout with local
  HTTP fixtures serving verified copies of existing live public derivatives.
  It checked 1440, 1024, 760, 390 and 320px: no horizontal overflow, centred cover,
  controls at least 44px, contain viewer, keyboard focus/Escape, autoplay,
  reduced motion, empty/broken/slow/single-image and long-credit cases.
- Desktop/tablet hero measured 650px; responsive heights were approximately
  677px at 760, 687px at 390 and 837px at 320. Narrow layouts grow to retain
  readable copy and accessible controls, rather than applying the old fixed
  showcase height overrides.
- Opening the viewer preserved background width; closing restored overflow,
  scrollbar gutter and trigger focus.

## Image quality and contrast

The current pipeline caps the detail derivative at 1280px, but the inspected
published examples are only **831×465/466**. Existing daylight and sunset
Minecraft images remain usable but visibly soft at 1440px (roughly 1.7× upscale
before high-DPI). A larger derivative cannot recover missing source detail.
Original bytes and the media pipeline remain unchanged.

Sampled cream-text contrast, calculated from source pixels and the actual
overlay at text-line locations, was at least approximately **9.05:1** across
those daylight/sunset examples at desktop/mobile widths. This is a sample-based
review, not an exhaustive certification of all future images. Orange on the
cream headline highlight is **4.67:1**; light primary-button text on orange is
**5.14:1**. Controls use opaque dark surfaces. Future image selections should
still receive a visual contrast/crop review.

## Before Phase 3

1. Review the finished homepage with a screen reader and on physical iOS/Android
   devices; test touch scrolling and the native dialog with browser zoom.
2. Confirm real OAuth/member navigation in the intended development environment;
   automated checks use mocked OAuth, not Discord credentials.
3. Check selected screenshots' central crops, titles, required attribution and
   links. Open the full-image viewer, follow Source, use Tab/Shift+Tab/Escape,
   and try reduced motion plus failed/expired media.
4. Prefer higher-resolution source uploads. Separately evaluate a larger guarded
   derivative only for genuinely larger sources, with bandwidth/quality review.
5. Approve editorial banner/content layouts before beginning public subpages.
   No Phase 3 implementation is included here.
