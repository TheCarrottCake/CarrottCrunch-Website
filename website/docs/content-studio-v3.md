> Latest follow-up: [Shared dialog usability refinement](studio-dialog-usability.md) adds fixed dialog chrome, optional metadata disclosures and mobile viewport handling. Earlier rollout statements below remain historical.

> Follow-up completed: [Shared editors rollout](studio-shared-editors-rollout.md) moves Media Library metadata to the shared dialog and refines Homepage/Gallery. The earlier rollout table below records its original status.

# Content Studio V3 - visual collections and item dialogs

November 11, 2026 (America/Toronto). Implemented locally in the C: V3 checkout,
`feature/cinematic-redesign-v3`, retaining the existing uncommitted collage,
Phase 7A/7B and historical-photo work. Public styling remains provisional.

## Implemented experience

Collection overview -> select a thumbnail -> edit an item -> Save item -> explicitly
save the collection's private revision or publish through its existing toolbar.

About Memories no longer shows six expanded slot forms or unused positions.
The overview has Add Photos, shared-library multi-selection, multi-upload,
thumbnail cards, photo count, status, edit, earlier/later ordering and confirmed
removal. Uploads use the existing endpoint and batch rules. Duplicate new selections
are ignored; existing duplicate references are retained rather than silently cleaned
up. Removing an entry does not delete its Media Library asset.

Each item dialog has an image preview, placement-specific caption/title and alt,
replacement picker, Save and Cancel, and confirmed removal. About photos can be
featured in the collage or assigned to the single smaller story placement. Selecting
a new feature clears the previous feature in the working collection. Homepage
entries retain copy, same-site CTA settings and visibility; Gallery entries retain
titles, descriptions, visibility and featured status. Global creator credits and
rights stay with the asset and are linked to the existing Media Library editor;
required credits remain visible in preview/public delivery.

Save item changes only in-memory working state. It does not write a revision,
publish, replace the live release or change global metadata. The existing explicit
Save Changes/publication confirmation, Save private draft, Schedule, Unpublish,
history and Restore controls remain collection-level actions.

## Dialogs and compact controls

Shared native-modal primitive provides labelled dialogs, initial focus, focus
containment, Escape, focus restoration, background scroll locking, unsaved-change
confirmation and browser-unload protection. Pending cover uploads block dismissal.
Validation stays inside the dialog with accessible feedback; Enter in an input does
not accidentally submit the containing collection. Mobile dialogs nearly fill the
viewport and scroll internally. Image previews preserve aspect ratio.

Shared 24px stroked icons follow the existing editor-toolbar vocabulary; no icon
package or dependency was introduced. Secondary icon controls have descriptive
accessible names, native title tooltips, focus rings and 44px targets. Reordering
uses keyboard-operable earlier/later buttons rather than requiring drag gestures.
Removal is separated from common controls and requires explicit confirmation.
Primary actions keep short text labels and icons. The editor toolbar retains clear
working/live state and a compact More menu.

The shared picker supports selections across pages, preserves successful uploads,
blocks adding while uploading, ignores stale search responses and keeps blocked
assets unavailable. Rights and expiry are still checked server-side on publication
and delivery; selection is not permission to publish.

## Backward-compatible collection format

No database migration is required. The existing JSON revisions and generic
`studio_media_references` support an ordered array:

```ts
photos: Array<{
  id: string;          // opaque UUID for new entries; legacy key retained on conversion
  assetId: string;     // existing Media Library UUID
  alt: string;
  caption: string;
  placement: 'collage' | 'story';
  featured: boolean;
}>
```

Legacy `memories.opening`, `history` and `collage1` through `collage4` remain readable,
publishable and restorable. Their IDs, asset references and descriptions survive
conversion, with opening featured and history in the story placement. Reading a
legacy revision does not convert or write it. The editor converts in working state
only when staff edit/add/reorder/remove, and persists only after an explicit
collection save. Legacy published revisions and history are never rewritten.
A restored legacy revision remains private until separately published.

Validation rejects ambiguous mixed formats, unknown fields, malformed/duplicate
entry identifiers, bad asset IDs, invalid placement, multiple featured/story images,
control characters and excessive field lengths. Reference manifests are always
derived on the server as `memory:<entry-id>`; submitted manifests are not trusted.
Failed/conflicting submissions hydrate all selected images using the same helper.
Captions and placement alt text remain revision-bound.

No persistent D1/R2 writes, migrations, reseeds or media imports were performed.
Read-only inspection confirmed persistent schema 0013. Unrelated proposed 0014
remains unapplied. Staff authorization, consent and audit data were not changed.

## Public About and limits

The approved About writing, founder content/icon and original collage treatment
are retained. The live collection supplies feature/support ordering and the story
photo. A featured photo leads; otherwise the first available collage photo leads.
Unused, unavailable or failed photos leave no placeholder frames. The image viewer,
required attribution, descriptive alt, reserved frames, lazy loading and small-source
constraints remain. Changing the legacy history photo's placement now works too.
Historical/current-server distinctions and portrait exclusions remain unchanged.

The bound is **100 selected photos**, matching V2's existing 100 media-reference
budget, rather than the former six presentation slots. Up to 24 thumbnails are
rendered initially; Show more adds 24 without losing the full ordered collection.
Public photos load lazily; only the live authorized revision is projected.

Existing request limits remain: 180,000 JSON characters and a 256 KiB encoded form.
Long text or multi-byte characters can reach the form budget before 100 items.
The editor omits the derived media manifest from submissions and preflights both
limits, displaying an alert and retaining edits instead of submitting oversized
input. Captions are at most 300 characters and alt text at most 1,000. Uploads
retain the existing ten-file batch, total-size, MIME and dimension safeguards.
The normalized About payload also has a 256 KiB validation bound.

Very large public collections should receive owner composition/performance review;
this does not authorize inventing filler, duplicate photographs or rights clearance.
The 100-entry fixture is synthetic, private and for capacity testing only.

## Status by tool and remaining rollout

| Tool | Current implementation | Remaining work |
| --- | --- | --- |
| About Memories | Visual collection, multi-select/upload, reorder, item dialog, caption/alt, feature/story, sparse public collage, private preview | Owner usability/crop review and lawful content import |
| Homepage / banners | Shared thumbnail manager and entry dialogs; copy, CTA, visibility, ordering preserved | Owner usability review |
| Community Gallery | Shared thumbnail manager and entry dialogs; copy, feature, visibility and ordering preserved; credits link to central metadata | Owner review; global credits remain asset metadata |
| Posts & Events | Shared cover dialog; long-form Markdown editor and inline-media insertion remain on page; toolbar icons | Separate attached-media dialog rollout preserving Markdown occurrence/range editing |
| Media Library | Existing metadata/rights/usage/trash dialog preserved; shared picker now supports batch selection and icons throughout editors | Migrate metadata dialog to shared primitive in a focused follow-up |

The Media Library already has a working pop-up with metadata CAS/version conflicts,
usage queries, restrictions, expiry and recoverable trash. Replacing it alongside
collection editing would couple global-asset mutations to new item state. Follow-up
should adapt those asynchronous failure/pending/usage flows to the primitive, keep
its rights fields and private headers, protect unsaved global edits, and repeat
stale-response/conflict/trash/expiry tests. Do not copy placement captions into global
metadata. No new metadata storage or permission model is proposed.

For post/event inline media, stage an occurrence-aware editor that preserves cursor
selection and Markdown order while replacing/removing only the chosen occurrence.
Keep cover and attached-image state separate; do not move the rich-text area into
a modal or change publication services. Existing insertion remains available now.

## Verification

- 171 full regressions passed; typecheck and production build passed.
- Current built-route/authentication checks, Content Studio V2 Worker/Cron,
  About Memories Worker, Staff Management Worker and Staff Profiles Worker passed.
  Disposable profile tests do not apply proposed 0014 to persistent data.
- About Worker now covers ordered collections beyond six photos, placement changes,
  private save isolation, exact public references and private legacy restoration,
  in addition to CSRF, alt errors, stale input, real Cron, roles and unpublish.
- Actual authenticated Edge review at 1440, 1024, 760, 390 and 320px: About manager,
  item dialogs, multi-select, homepage/Gallery managers and dialogs, public About,
  cover dialogs and the existing Media Library. No horizontal overflow.
- Browser checks cover item validation and save isolation, confirmed removal,
  ordering, rejected/accepted unsaved dismissal, Escape/focus restoration,
  bidirectional Tab trap, background scroll lock, 44px actions and nested picker use.
- Disposable 100-photo private save, 24-at-a-time rendering and legacy restoration
  were exercised. No synthetic capacity content appeared on public About.
- Homepage image activation and slideshow controls were checked on desktop/mobile.
- `git diff --check` passes. Nothing staged or committed; backups preserved.

Manual checks remain: real Discord sessions, screen readers, physical touch devices,
owner tool usability and crop review. Historical candidate permissions and attribution
still need confirmation before any real import/publication. No automatic migration,
publication, production change or final public-site redesign is part of this work.

## Screenshots

All review media is ignored/private under `.wrangler/studio-v3-review/`.
The gated localhost fixture uses disposable D1/R2, synthetic sessions, existing
historical review candidates and clearly labelled synthetic capacity assets.
It is not persistent Content Studio data or approval to publish candidate imagery.

- Before: [desktop](../.wrangler/studio-v3-review/before-editor-1440.png),
  [mobile](../.wrangler/studio-v3-review/before-editor-390.png).
- New manager: [desktop](../.wrangler/studio-v3-review/manager-1440.png),
  [mobile](../.wrangler/studio-v3-review/manager-390.png).
- Item dialog: [desktop](../.wrangler/studio-v3-review/dialog-viewport-1440.png),
  [mobile](../.wrangler/studio-v3-review/dialog-viewport-390.png),
  [mobile settings/actions](../.wrangler/studio-v3-review/dialog-settings-390.png).
- Multi-select: [desktop](../.wrangler/studio-v3-review/multi-select-1440.png),
  [mobile](../.wrangler/studio-v3-review/multi-select-390.png).
- Homepage editor: [desktop](../.wrangler/studio-v3-review/homepage-manager-1440.png),
  [mobile dialog](../.wrangler/studio-v3-review/homepage-dialog-390.png).
- Gallery editor: [desktop](../.wrangler/studio-v3-review/gallery-manager-1440.png),
  [mobile dialog](../.wrangler/studio-v3-review/gallery-dialog-390.png).
- Cover: [desktop](../.wrangler/studio-v3-review/cover-dialog-1440.png),
  [mobile](../.wrangler/studio-v3-review/cover-dialog-390.png).
- Public About: [desktop](../.wrangler/studio-v3-review/about-1440.png),
  [mobile](../.wrangler/studio-v3-review/about-390.png).
- [100-photo private overview](../.wrangler/studio-v3-review/large-collection-1440.png).

All five width variants and browser-result JSON are in the same folder.
Do not stage screenshots, browser profiles, raw photos or fixture data.

## Files for this development effort

New shared components: `app/components/studio-actions.tsx`,
`studio-item-dialog.tsx`, `studio-collection-manager.tsx`, `studio-cover-editor.tsx`.

Changed components: `about-memories-editor.tsx`, `about-memory.tsx`,
`studio-editor.tsx`, `studio-media-picker.tsx`; `app/routes/about.tsx`;
scoped `app/app.css`.

Model/services: `app/lib/about-memories.ts`, `about-memories.server.ts`,
`about-memories-validation.server.ts`, `studio-model.ts`, `studio-media.server.ts`.
No authorization or SQL migration files changed for this task.

Tests: `tests/about-memories.test.mjs`, `about-memories-worker.mjs`,
`studio-v2-ui.test.mjs`. Documentation: this handoff, `project-status.md`, and the
supersession note on `about-memories-collage.md`.

Earlier uncommitted collage/image-control, Servers history, staff administration,
staff profiles and historical-photo protections remain preserved separately.
