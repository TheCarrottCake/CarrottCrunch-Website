> Follow-up: [Shared dialog usability refinement](studio-dialog-usability.md) records the fixed header/footer, metadata disclosures, mobile viewport handling and updated verification.

# Content Studio V3 - shared editors rollout

November 11, 2026. C: V3 checkout, feature/cinematic-redesign-v3.
All work remains unstaged and uncommitted alongside existing Phase 7A/7B,
About Memories, historical-photo and Update/Schedule Update changes.

## Rollout and shared behavior

Homepage and Gallery already used the V3 thumbnail manager and shared item dialog.
This rollout retains that implementation, verifies it before the Media Library
changes, and adds explicit slide positions and Gallery creator/required-attribution
information. Supported slide fields remain image, title, supporting copy, alt,
same-site CTA/link text and visibility. Gallery retains display title, description,
alt, visibility and featured status. Earlier/later buttons reorder working entries;
confirmed removal retains the shared asset. No new slideshow or collaborator schema
was invented. Creator information remains centrally managed in Media Library.

Item Save changes working form state only. The same collection toolbar provides
Publish/Update, Schedule Publication/Update, Save Draft and Preview, with Unpublish
under More. The public release remains live while editing. Schedule cancellation
warnings remain: later private saves/restoration cancel the pending revision.
Independent scheduled revisions are a future improvement, not part of this rollout.

Media Library now uses StudioItemDialog with the same header, footer, preview,
Cancel, focus management, Escape, dirty-state confirmation, unload protection and
mobile treatment. The primitive accepts a context label and explanation so global
metadata saving is clearly distinct from saving a collection item. Global Save
metadata writes immediately through the existing guarded asset endpoint; it does
not publish a collection. The dialog explicitly explains that creator credits,
rights and restrictions may affect multiple placements, while placement captions
and alt descriptions stay independent.

The library uses compact shared thumbnail cards and collapsed optional uploads.
Existing search, MIME filter, sorting, pagination and trash view remain. Its dialog
retains title, default alt, creator, source, required credit, description, tags,
internal notes, restriction flag, Toronto expiry and current usage links. About
Memories usage links now point to the correct collection rather than Posts.
Private internal notes are not added to any public projection.

Metadata fields lock while saving and in trash. Save failures retain uncontrolled
input values and visible errors; version/CSRF checks remain server-side. Usage
queries carry a generation guard so closing/reopening another asset cannot apply
an older response. Trash is disabled until usage loads successfully and for known
referenced assets; authoritative database reference protection remains unchanged.
Trash/restore stays confirmed and recoverable. After removal from the current list,
focus moves to search. No original bytes are replaced or deleted by this UI.

Required and creator credit previews follow the selected replacement asset; an
empty new credit never falsely inherits the old asset's attribution. No member
self-submissions, approval queue, permissions, new dependencies or media store
were introduced. Public homepage/hero, gallery delivery and approved page designs
were not changed.

Shared Add uses plus, replacement uses images, Edit uses pencil, publication uses
check, scheduling uses calendar, Save uses save, removal uses trash and More uses
ellipsis. Primary controls retain labels; existing icon-only item controls retain
accessible names, native tooltips and 44px targets. The shared dialog is centered
consistently and isolates legacy Media Library button/preview spacing.

## Source files

- app/components/studio-collection-manager.tsx: slide positions and Gallery credits;
  truthful replacement metadata.
- app/components/studio-item-dialog.tsx: reusable global-asset context/description.
- app/routes/studio-library.tsx: shared modal, compact cards/upload disclosure,
  dirty state, pending locks, guarded usage responses and safe trash controls.
- app/components/studio-actions.tsx, studio-media-picker.tsx, studio-editor.tsx:
  consistent Add/More icons within the existing shared conventions.
- app/app.css: shared modal centering and scoped legacy-host spacing corrections.
- tests/studio-library-ui.test.mjs: shared-modal failure/input preservation and
  deletion readiness; tests/studio-v2-ui.test.mjs: slide/credit regression.
- This handoff and project-status/V3 handoff links.

Publication services, authorization, schemas and media-delivery services were not
rewritten. No persistent D1/R2 mutations, seeds or migrations were performed.
Read-only ledger inspection confirms 0013; proposed 0014 remains unapplied.
AGENTS.md.backup and unrelated uncommitted work are preserved.

## Verification

172 full regressions, typecheck and build pass. All current built-route/authentication,
Content Studio V2 Worker/Cron, About Memories Worker, Staff Management Worker and
Staff Profiles Worker checks pass using disposable storage. Existing integration
coverage protects direct Update, private drafts, scheduling/real Cron and cancellation,
rights/expiry, reference protection, optimistic conflicts, restoration and privacy.
UI regression checks cover stale search responses, usage failure blocking trash,
metadata/trash failure preservation, slide position and creator/required credit.

Authenticated isolated Edge review covers Homepage, Gallery and Media Library
managers/dialogs at 1440, 1024, 760, 390 and 320px with no horizontal overflow.
Global metadata save and credit hydration, unsaved Escape confirmation, focus
restoration and actual recoverable trash/restore were exercised on disposable data.
The previous shared-manager browser checks for item editing/reorder/removal,
private saves and scheduled updates remain applicable; server services are unchanged.

Screenshots and fixture scripts are ignored/private review artifacts. The fixture
uses a localhost header gate, disposable D1/R2 and synthetic sessions. Historical
candidate images are private review material, not a persistent import or rights
clearance; capacity pixels and credits are clearly test-only. No real member or
owner content was edited. Physical devices, screen readers, real Discord sessions
and owner usability review remain manual checks.

## Before/after and dialog screenshots

All widths are in .wrangler/shared-rollout-review/; representative links:

| Tool | Before desktop | After desktop | Mobile |
| --- | --- | --- | --- |
| Homepage | [Before](../.wrangler/shared-rollout-review/before-homepage-manager-1440.png) | [After](../.wrangler/shared-rollout-review/homepage-manager-1440.png) | [Manager](../.wrangler/shared-rollout-review/homepage-manager-390.png) |
| Gallery | [Before](../.wrangler/shared-rollout-review/before-gallery-manager-1440.png) | [After](../.wrangler/shared-rollout-review/gallery-manager-1440.png) | [Manager](../.wrangler/shared-rollout-review/gallery-manager-390.png) |
| Media Library | [Before](../.wrangler/shared-rollout-review/before-media-library-1440.png) | [After](../.wrangler/shared-rollout-review/library-1440.png) | [Library](../.wrangler/shared-rollout-review/library-390.png) |

- Homepage dialog: [desktop](../.wrangler/shared-rollout-review/homepage-dialog-1440.png), [mobile](../.wrangler/shared-rollout-review/homepage-dialog-390.png).
- Gallery dialog: [desktop](../.wrangler/shared-rollout-review/gallery-dialog-1440.png), [mobile](../.wrangler/shared-rollout-review/gallery-dialog-390.png).
- Metadata dialog: [desktop](../.wrangler/shared-rollout-review/metadata-viewport-1440.png), [mobile](../.wrangler/shared-rollout-review/metadata-viewport-390.png).
- Metadata rights/actions: [desktop](../.wrangler/shared-rollout-review/metadata-settings-1440.png), [mobile](../.wrangler/shared-rollout-review/metadata-settings-390.png).
- [Shared creator credit shown in Gallery](../.wrangler/shared-rollout-review/gallery-credit-1440.png).

The before images show the existing V3 rollout baseline, not a discarded older
checkout. Homepage and Gallery were already visual editors; their improvements
are deliberately incremental.

## Deferred work

Posts & Events keep their current long-form editor and existing shared cover dialog.
Occurrence-aware inline attachment dialogs remain a separate follow-up, preserving
Markdown/cursor semantics. Independent schedules, physical-device/screen-reader
review and the final coordinated public-site design pass remain deferred. No
remaining schema approval is needed for this rollout. No commits, pushes, merges,
deployments, production changes or live teaser modifications were made.
