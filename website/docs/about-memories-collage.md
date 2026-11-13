> Superseded by [Content Studio V3 visual collections](content-studio-v3.md).
> The original collage and image activation are retained; six fixed slots now have a backward-compatible ordered-photo successor. This handoff records the earlier implementation.

# About Memories collage and public image controls

November 11, 2026 (America/Toronto). Local V3 checkout:
`C:\Projects\CarrottCrunch-Website`, `feature/cinematic-redesign-v3`.
Implementation remains uncommitted, alongside the preserved Phase 7A/7B work.

## Managed placements

Six optional positions use the existing About Memories collection:

| Key | Editor label | Public placement |
| --- | --- | --- |
| `opening` | Community memories | Lead opening-collage image |
| `collage1` | Community memory 2 | Supporting collage image |
| `collage2` | Community memory 3 | Supporting collage image |
| `collage3` | Community memory 4 | Supporting collage image |
| `collage4` | Community memory 5 | Supporting collage image |
| `history` | Shared worlds & moments | Smaller image within the history story |

The original `opening` and `history` keys retain their meaning and references.
The public collage uses only populated, safely delivered images. Empty and failed
positions disappear; the first remaining collage image becomes the lead.
There are no public placeholder frames. One through five opening images have
count-aware compositions, with subtle desktop frame rotation and a mobile grid.
Images reserve frame dimensions, crop with `object-fit: cover`, have alt text and
lazy loading, and open their uncropped guarded derivative. Small source images
are constrained to their natural width and aspect ratio.

All six positions have Media Library pick/upload/replace/remove controls and
alt-text editing. The private preview reflects selected positions and shows the
story image separately. Existing draft/live revisions, history, concurrency,
role checks, CSRF, scheduling and exact release/media authorization remain in use.
Removing a position never deletes its Media Library asset.

## Data and photo safety

No migration is required: migration 0013 stores the collection snapshot as JSON,
and its existing media-reference structure accepts named placements. Only shared
TypeScript slot definitions, validation and hydration needed expansion. No
persistent database, Media Library record or published revision was changed.
Proposed staff-profile migration 0014 remains unapplied.

The historical-photo exclusions remain authoritative. No portraits were restored,
copied into this feature, recommended or included in the review fixture. Raw
archive originals remain blocked from public delivery/build output by the existing
privacy plugin. Existing Server History and official branding were preserved.

Recommended candidates, pending creator rights/attribution confirmation:

- `Minecraft 11_18_2018 2_16_01 PM (1).png`: the hall group screenshot,
  suitable for `opening`; preserve the group in the crop.
- `Minecraft 11_19_2018 4_04_48 PM.png`: the woodland group screenshot,
  suitable for `collage1`; remove the application title bar in a display copy.
- `New Icon.png`: the tree-settlement landscape, suitable for `history`, using
  the existing reviewed landscape derivative.

These are historical candidates, not evidence of current Create gameplay. No
server names, builders, dates or participant identities are inferred. Other
collage positions should remain empty until additional suitable images have
rights clearance. Do not fill them with duplicates for publication.

After rights/attribution review, authorized staff should use normal Media Library
upload and About Memories selection, enter confirmed metadata/alt/required credit,
review the private revision, and explicitly publish. This task does not perform
that persistent import or replace currently saved imagery.

## Public image controls

The registered public homepage, About and Gallery presentations now use the image
surface as the existing dialog trigger. Redundant visible full-image CTAs were
removed; accessible labels remain. No replacement visible buttons or hover labels
were added. Keyboard activation, native modal Escape behavior, focus restoration,
guarded derivative delivery and required credits remain. Gallery management and
Content Studio upload/replace/remove actions were preserved.

The homepage trigger covers the exposed image surface; CTAs and slideshow controls
retain their own hit targets. Hero copy, slide order, rotation timing, previous/next,
pause, progress, reduced-motion behavior and mobile navigation remain unchanged.
About writing, founder content/icon and brand artwork were not edited.

## Verification and review artifacts

- Full regression suite: 169 passed; typecheck and production build passed.
- About Memories built Worker: six-slot publication/media delivery, legacy slots,
  migration readiness gate, permissions, CSRF/origin, draft isolation, stale-input
  conflict, real disposable Cron, unpublish and inactive-staff guards passed.
- Current Content Studio V2 Worker/Cron, built-route/authentication, Staff Management
  Worker and Staff Profiles disposable-schema Worker checks passed. The latter
  does not apply migration 0014 to existing local data.
- Actual isolated Edge review: About and authenticated editor/preview at 1440,
  1024, 760, 390 and 320px; homepage at 1440, 390 and 320px; Gallery at 1440 and
  390px. No horizontal overflow. Images decoded, image activation/Enter,
  Escape/focus restoration and slideshow previous/next/pause passed.
- Actual image-surface mouse activation, independent CTA hit targets, reduced-motion
  slideshow disabling and failed-image promotion passed on desktop/mobile.
- `git diff --check` passed; nothing is staged.
- Maximum five-position collage was additionally exercised with temporary DOM
  clones for geometry only, not saved content or image recommendations.

Screenshots and machine-readable browser checks are local ignored artifacts in
[the review folder](../.wrangler/about-collage-review/):

- [About desktop](../.wrangler/about-collage-review/about-1440.png)
- [About mobile](../.wrangler/about-collage-review/about-390.png)
- [Collage desktop detail](../.wrangler/about-collage-review/collage-detail-1440.png)
- [Collage mobile detail](../.wrangler/about-collage-review/collage-detail-390.png)
- [Homepage desktop](../.wrangler/about-collage-review/home-1440.png)
- [Homepage mobile](../.wrangler/about-collage-review/home-390.png)
- [Gallery desktop](../.wrangler/about-collage-review/gallery-1440.png)
- [Editor desktop](../.wrangler/about-collage-review/editor-1440.png)
- [Private preview mobile](../.wrangler/about-collage-review/preview-390.png)

These screenshots use an access-gated localhost fixture with disposable D1/R2 and
synthetic staff sessions. Three historical candidates exercise real guarded upload,
derivative, collection and rendering paths solely inside that fixture. They are
not a persistent import, public publication, rights approval or proof of live
content. The fixture rejects requests without its local review header. Screenshots
are private review material and must not be staged or treated as publishable assets.

Remaining owner/manual checks: final crop/composition approval, creator permission
and mandatory attribution, real Discord sessions, assistive technology and physical
mobile devices. Overall visual design remains provisional until the coordinated
site-wide pass. No push, merge, deployment or production resources were touched.

## Source changes for this task

- `app/lib/about-memories.ts`, `studio-model.ts`,
  `about-memories-validation.server.ts`, `studio-media.server.ts`,
  `dashboard-tools.ts`: shared slots, validation, media hydration and tool copy.
- `app/components/about-memory.tsx`, `about-memories-editor.tsx`,
  `full-image-dialog.tsx`, `community-hero.tsx`, `public-gallery.tsx` and
  `app/routes/about.tsx`: collage, management preview and image activation.
- `app/public-v3.css`, `app/app.css`: scoped public composition and editor preview.
- `tests/about-memories.test.mjs`, `about-memories-worker.mjs`,
  `public-editorial.test.mjs`, `studio-v2-ui.test.mjs`: six-slot, sparse-public,
  viewer, editor and Worker coverage.
- This handoff and `docs/project-status.md`.

Other working-tree files belong to existing Phase 7A/7B and historical-photo work;
this task does not authorize staging, resetting or discarding them.
