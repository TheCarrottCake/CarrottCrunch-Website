> **Content Studio V2:** For the current direct-publishing workflow and shared media architecture, see [content-studio-v2.md](content-studio-v2.md). Approval instructions below describe the retained historical implementation.

# Milestone 05D — Editorial media and featured images

The subsequent [direct content upload workflow](content-image-uploads.md) adds in-editor uploads and immutable pending-image drafts through migration 0010. Moderators can save/submit new uploads before editorial authorization; pending images remain blocked from approval/publication. Administrators/Owners review evidence in the editor, explicitly authorize an image, save a new revision and then use the same 05C content approval controls. Existing 05D approved-image delivery and live revision isolation remain in place.

05D-A and 05D-B extend the existing private Media Library and 05C publishing service. Announcements and events support one optional featured image. Text-only content remains valid. Inline Markdown images, cropping/focal-point controls, new public event detail pages, gallery publishing, external promotion and production activation are outside this milestone.

## Consent and staff permissions

Editorial consent covers announcements, events, their cards and same-site homepage teasers. It does not inherit or grant gallery/homepage/external-promotion permissions from the older independent scopes. Only current Administrators/Owners can record editorial decisions; routes validate the staff session and CSRF, and insertion triggers recheck the current role inside the transaction. Moderators may select eligible images and save/submit drafts, but cannot approve editorial consent or publish content.

An approved decision requires the rights holder and verifiable creator permission/licensing evidence. Administrative approval does not establish creator rights by itself. Unresolved conditions block approval. Existing alt text, provenance and creator attribution (or explicit anonymity) must also be complete before image preparation. Permission expiry retains the Media Library's existing start-of-date UTC convention; event/publication scheduling remains the existing Toronto calendar and quarter-hour AM/PM flow.

Consent decisions are append-only and compare the previous decision ID. The decision and immutable audit succeed together. Each changed decision supersedes the previous grant; existing presentations tied to the old grant immediately become unavailable for public use. Saving an identical decision is a no-op so an unchanged approval does not unexpectedly remove live images. Revocation has a confirmation. A new approval after revocation/expiry does not resurrect old releases: select the image again, save a new editorial revision, and authorize a new release.

## Storage and immutable editorial revisions

Additive migration `0009_editorial_media.sql` introduces:

- `media_editorial_grants` and its current-decision pointer.
- Immutable `media_editorial_derivatives`: original checksum, private card/detail keys, output checksums and dimensions.
- Immutable `media_editorial_images`: exact derivative/grant identity, asset version, alt text, creator/anonymity and safe source URL.
- Immutable `content_revision_media`, captured automatically from each new snapshot's optional `featured_image_id`.
- Shared eligibility and active-reference views plus integrity, approval, release and trash-protection triggers.

No historical snapshots or approvals are rewritten. Existing assets are not automatically approved or converted. Original identity/key/checksum/dimensions cannot be edited to substitute different image bytes; upload a new asset instead.

The picker prepares metadata-free PNG derivatives using the existing Photon WASM decoder. Card/detail images fit within 480/1280 pixels respectively, never upscale and preserve aspect ratio. Each encoded output is limited to 8 MiB. Originals stay private and the existing private preview endpoint remains staff-only. New PNG derivatives have their own private keys and checksum records; they are never served by exposing an R2 bucket or public storage URL.

R2 preparation runs before D1 presentation acceptance. The original checksum is verified before decoding. The D1 insertion rechecks asset version, exact source, attribution, current consent and expiry. Racing preparations may reuse an accepted derivative. Failed or duplicate preparations can leave private orphan objects; no automatic cleanup deletes objects that another accepted presentation might reference. Preparation never authorizes public delivery. Orphan reconciliation/purge tooling is not included.

Saving a selected presentation ID, changing/removing it, or explicitly selecting updated library metadata creates a new editorial revision through the existing transaction. Approval/schedule invalidation and the separate live release are preserved. Library metadata edits never mutate saved or live alt text/credits. A revision cannot acquire a different binding later; bindings must match its immutable snapshot.

`active_editorial_media` follows current working revisions and actual scheduled/live release pointers. Trash is blocked both in the service and by database triggers. Removing a draft image does not release a still-live image; cancelling a schedule does not release an image still in the working copy. Unpublish preserves working-reference protection. Archive clears live/scheduled protection and excludes the archived working revision. Historical bindings remain stored but do not grant public access or permanently prevent recoverable trash. Existing 04A reference protection and permanent-deletion prohibition remain in force.

## Publishing and public delivery

The existing submit/approve/publish/schedule/combined-action paths recheck current consent, derivative presence and encoded-byte checksums. Scheduling also requires permission to remain valid at its requested release time. SQL triggers recheck eligibility inside approval/release transactions, closing consent/save/trash races. Cron receives the private R2 binding, revalidates media at execution and retains the previous live release on failure. Bounded processing, current authorizer-role checks, cancellation and overlapping-invocation deduplication remain in the existing workflow service.

`/media/releases/:releaseId/:imageId/:variant` supports only `card` and `detail`. It verifies a non-fixture current live release, explicit approval and exact revision binding, active asset, current grant and expiry. Knowing an asset, presentation or historical release ID is insufficient. It accepts no arbitrary R2 key, query transformation or original variant. The server resolves keys, verifies returned byte checksums, and rechecks live identity/consent after the R2 read. GET/HEAD responses use explicit PNG MIME, `nosniff`, restrictive CSP, same-origin resource policy and `no-store`; conditional requests cannot bypass authorization. No CDN/Cache API public caching is introduced.

Public content queries batch-load only safe presentation fields from live bindings. Revoked/expired images are omitted while published text remains available; previously issued image URLs also deny delivery. An image that becomes unavailable between page rendering and image loading falls back to an unavailable-image message. Already downloaded copies cannot be recalled. Evidence, provenance, staff identity, original filenames and R2 keys never enter public DTOs.

## Editor and picker

Both editors retain the 05C sticky action toolbar. Featured-image controls live with the content fields: Choose/Replace, a thumbnail/credit, availability guidance and Remove. The draft preview and saved-revision review display the same frozen presentation. The reusable dialog searches titles/filenames, filters image types, paginates, explains unavailable options and exposes alt text/credit for the selected image. Selection is explicit; Cancel/Escape restores focus and late preparation responses cannot change cancelled selections. Image preparation uses a fetcher submission, avoiding nested forms. Workflow actions stay blocked while image changes are unsaved. Invalid/stale saves retain submitted fields and the selected presentation ID.

## Local migration and verification

Migration 0009 is added and tested in isolated, non-persistent test databases only. Existing persistent local D1/R2 has not been migrated, reset, seeded or modified. Before interactive local acceptance, review migration 0009 and apply the normal local-only migration command from `website/`:

```powershell
npm.cmd run db:migrate:local
```

No remote migration, binding change, Cron activation or deployment is included. No dependency was added.

Run from `website/`:

```powershell
node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types tests/control-build.mjs
node --experimental-strip-types tests/publication-worker.mjs
node --experimental-strip-types tests/media-worker.mjs
```

Coverage includes explicit consent/role/CSRF checks, conditional approvals, immutable binding/bytes/attribution, private/live isolation, corruption/missing storage, revocation/expiry and non-resurrection, safe public URLs/HEAD/conditional responses, combined publication rollback, consent/publication and save/trash races, failed consent audits and active-reference protection. Built workerd tests exercise real image preparation through the picker, public announcement images and event images released by overlapping Cron invocations. Existing auth, editor, media and publication regressions remain included.

Isolated browser fixtures under ignored `.wrangler/05d-review/` exercise both editors at 1440/390/320px, picker bounds, eligible-only choice, Tab/Shift+Tab containment, Escape/focus return, Select/Remove, no nested forms, and dirty publication blocking. Fixtures use labelled illustrative content and mocked picker responses, not authenticated publishing sessions.

Implementation verification: the full serial suite passed **95 tests**. After the final explicit Cron byte-integrity guard, all **22 affected media/editor/publication tests** passed again. Final typecheck, client/server build, built-route checks, both local workerd suites and `git diff --check` passed. Picker browser fixtures passed at all three widths and screenshots were inspected. No persistent local database migration or production operation was run.

## Manual local acceptance checklist

1. Sign in as Moderator, Administrator and Owner. Confirm editorial decision controls and server authorization match each role; verify missing/invalid CSRF cannot prepare/select or approve media.
2. Supply actual creator permission evidence on a local test asset. Verify missing alt text/provenance/credit, unresolved conditions, revoked/expired consent and trash prevent selection/publication. Confirm existing gallery/external permissions do not grant editorial use.
3. In each editor, Choose, Cancel, Select, Replace and Remove an image. Check thumbnails, frozen alt text/credit, search/type filters/paging, empty/error states and saved/unsaved behavior. Repeat using only the keyboard at desktop/390/320px and with a screen reader.
4. Publish a labelled test announcement with an image. Check homepage/Updates cards and announcement detail, aspect ratio, credit/source and no-store image responses. Publish an event with an image and check its existing cards; there is no new event-detail page.
5. Change library metadata, then edit a private content revision. Confirm live text/media/alt/credit do not change. Explicitly replace/reselect the image, save, review and release; confirm only the new authorized release changes public media and old release URLs stop working.
6. Revoke consent and test expiry. Confirm published text remains, image delivery stops, and renewed approval alone cannot restore the old image. Reselect/save/release to restore it intentionally.
7. Schedule a replacement, trigger local Cron explicitly without a visitor, and repeat the invocation. Test consent revocation/missing derivatives before execution: no unsafe replacement or duplicate audit may occur.
8. Attempt trash while working, scheduled and live references exist. Remove/cancel/archive references as appropriate; verify remaining live references still protect the asset. Check legacy media references, recovery and private previews after logout/role revocation.
9. Race two tabs saving content/permissions and race save/trash or consent/publication. Verify 409 preserves editor input and transactional failures leave no partial approval, release or audit.
