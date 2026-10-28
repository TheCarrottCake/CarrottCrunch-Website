# V3 Phase 2.1: cinematic hero refinement

Implemented locally on `feature/cinematic-redesign-v3`, with Phase 1 and Phase 2
work preserved. This supersedes the visual styling described in the Phase 2
handoff; the slideshow lifecycle and guarded public-image viewer remain intact.
The three pre-edit source files are copied to the ignored
`.wrangler/checkpoints/v3-phase21-before-20261027/` with SHA-256 hashes.

## Changes

- `app/components/community-hero.tsx`: added CarrottCrunch/Minecraft identification
  and a noninteractive position indicator derived from the usable published
  slide count. Moved the small counter between previous/next arrows. Retained
  pause/resume and the full-image trigger; single-image collections omit cycling
  controls. Reserved indicator space prevents image-loading layout shifts.
- `app/public-v3.css`: increased headline weight to 800 and desktop size to up to
  80px, composing the tagline, headline, supporting copy and larger CTAs in the
  left column. Removed the highlighted rectangle and underline only inside the
  V3 hero. Loaded images use the existing warm supporting orange for “world.”
  and cream-white for the rest of the heading. The image gradient is strong on
  the left and transparent at the far right, with a shorter 56px cream fade.
  The outlined control-panel shell is gone; arrows remain circular, with small
  dark backings under controls for contrast. The image viewer action is a
  discreet underlined label with a 44px target. No shared/global styling changed.
- `tests/community-hero.test.mjs`: added coverage for actual slide counts,
  noninteractive progress, active position, failed-image removal, the single
  counter, and hidden-but-reserved loading progress. Existing active-layer
  assertions now distinguish image layers from progress markers.

Mobile gets its own headline scale, directional overlay, 58% horizontal image
position, wrapped actions and stacked footer layout. Images remain centred on
desktop, with `cover`; the dialog remains uncropped `contain`. Original files,
public authorization, release checks and the media pipeline are unchanged.

## Verification

- Full regression run: **116/116 passed**. After the final reserved-progress
  adjustment, all **10 focused hero/foundation tests** passed again.
- Final `npm run typecheck`, `npm run build`, built-route checks and isolated
  workerd/Cron checks passed. `git diff --check` passed.
- Headless Edge checked 1440, 1024, 760, 390 and 320px widths: no horizontal
  overflow, targets at least 44px, correct image fill and native-dialog contain,
  Escape/Tab/focus restoration, seven-second autoplay, reduced motion,
  single/empty/broken/slow-image and long-attribution cases. Slow image loading
  does not change hero height.
- Measured hero heights: 650px at 1440/1024, approximately 636px at 760,
  648px at 390 and 755px at 320. Narrow screens grow to fit readable content.
- Sampled source-pixel/overlay contrast over existing published daylight/sunset
  examples at desktop/mobile: cream text at least approximately **8.54:1**;
  warm-orange “world.” at least approximately **4.41:1**, exceeding the 3:1
  requirement for its large bold text. Samples are not an exhaustive audit of
  all future images. Viewer gutter/scroll restoration also passed.

Browser screenshots use real components with verified local copies of existing
published derivatives and explicitly labelled local-review captions. They are
stored outside Git under `.wrangler/v3-phase2-review/`:

- `phase21-hero-1440.png`
- `phase21-hero-390.png`
- `phase21-hero-320.png`

## Review limitations

The pasted request refers to two reference screenshots, but their image files
were not supplied in this turn. The written direction was implemented; an exact
comparison to the second screenshot remains pending its attachment. Current
screenshots document the result, rather than claiming a verified mockup match.

Existing 831px-wide published examples still look soft enlarged on desktop;
neither originals nor derivatives were altered. Screen-reader and physical-device
testing remain recommended. No dependencies, migrations, backend or subpage
changes, commits, pushes, merges or deployments were made.
