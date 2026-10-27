# Content Studio V2

V2 replaces the staff-facing publication and image approval workflow with **Create → Preview → Publish**. This document supersedes the approval instructions in the historical 05A–05D documentation. No production resources were changed during implementation.

## Repository audit and reuse

The application remains React Router/React/Vite/TypeScript on Cloudflare Workers, D1 and private R2. V2 reuses Discord OAuth, member/staff sessions, current database role checks, CSRF validation, private response headers, image MIME/size/dimension validation, Photon optimization, R2 storage, the restricted Markdown renderer, Toronto/DST scheduling helpers, Worker Cron, audit records, and Apricot Glow/Leaf Sage tokens.

Previously the announcement/event editors, review pages, publication controls and image permissions formed separate approval steps. Homepage and gallery management were not shipped. V2 shares one editor, media picker, upload component and publication service across posts, events, showcase slides, banners and gallery collections. The new collection model is necessary for these formerly unmanaged content types; it does not create a second media store.

## Staff experience and permissions

- Posts & Events: searchable/filterable list, private drafts, cover upload/reuse, Markdown formatting and embedded shared images, local preview, publication, private replacement drafts, unpublish, scheduling, archive and revision restore.
- Homepage: showcase and banner tabs with upload/reuse, optional text, same-site links, visibility, reorder, replacement and removal.
- Community Gallery: curated image collection, optional title/description, visibility, ordering and featured entries. Creator credits are read from central metadata.
- Media Library: shared grid, multi-upload, filename/creator/description/tag search, type/sort filters, metadata, active uses, recoverable trash and restore.

Moderators, Administrators and Owners may publish, schedule and unpublish all these content types. Only Administrators/Owners may delete a content record from management. This delete is an audited logical tombstone; immutable history is retained. Unrelated staff administration remains restricted.

New content offers Save Draft, Preview and Publish. Published content offers Save Changes, Preview and Unpublish; Save Changes explicitly updates the public release after confirmation. More includes Save private draft, scheduling and secondary actions. A private save never replaces the live release. Restoring history creates a new private revision. New saves cancel the pending schedule for the superseded working revision.

Scheduling uses one date, 15-minute AM/PM options and America/Toronto. An omitted event end defaults to one hour after start. Repeated DST times require a first/second choice; nonexistent times show an error. Unchanged legacy event instants retain their original precision. Cron is independent of visitors and rechecks the authorizing staff account and exact media references.

## Shared media and credits

Every upload creates an existing `media_assets` record and uses existing private R2 originals/previews. No creator, description, tags, evidence or approval is required to upload. Uploading is immediate; saving attaches the asset to a document revision. Cancelling/removing an attachment leaves the reusable asset in Media Library.

Post/event covers, `![description](media:ASSET_UUID)` Markdown images, homepage slides/banners and gallery entries all reference the same asset ID. Public PNG derivatives are reused by asset/source checksum, not recreated for each placement. Originals remain private. Per-placement image descriptions are revision-bound; fallback descriptions use the content title. Staff should supply meaningful descriptions for informative images.

Creator/captured-by metadata is stored once. It appears automatically only in Community Gallery, with no empty credit placeholder. Required third-party attribution is a separate optional metadata field and appears wherever the asset is displayed. Shared creator/required-credit changes are intentionally reflected centrally under the V2 policy. Image bytes and placement descriptions do not silently change. Existing permission/audit records remain in D1; historical explicit restrictions and expiry are conservatively carried forward. Unresolved usage restrictions block publication/delivery, rather than requiring an approval queue.

The metadata editor can flag unresolved rights and set/clear a licence expiry date (start of the selected Toronto date). Clearing a revoked/expired restriction does not resurrect prior image releases: publish the affected content again to authorize a new release. Staff remain responsible for lawful use and required attribution. Optional fields do not manufacture creator consent.

Active working, live and scheduled references prevent trashing. Historical references remain immutable but do not indefinitely block recoverable trash after a document is archived/deleted. Restoring a historical revision whose media is unavailable fails safely. Media trash retains the existing 30-day recovery policy; there is no new physical purge job.

Failed uploads preserve the previous attachment. Batch uploads report per-file failures and retain successful files. Files uploaded but never attached remain private reusable library assets; they are not automatically deleted. Failed/racing derivative preparation may leave private, unreferenced R2 objects. Automatic object cleanup is deliberately deferred until a reviewed inventory/backup policy exists.

## Publication and delivery guarantees

`studio.server.ts` is the shared mutation boundary. A D1 batch atomically writes the version guard, revision, audit, media references, release and public pointers. Current roles are checked in guarded writes. Concurrent saves return 409 and retain submitted snapshot input. Failed media preparation does not replace an existing live release.

`/media/studio/:releaseId/:assetId/:variant` accepts only card/detail variants and validated UUIDs, with no arbitrary R2 keys, query transformations or original delivery. It requires the exact current live release and revision reference, checks restrictions/expiry, verifies immutable derivative bytes, and rechecks eligibility before responding. Responses use explicit image/png, no-store, nosniff, same-origin resource policy and a restrictive CSP. Unpublishing/replacement invalidates old release URLs.

Legacy `/media/releases/...` URLs remain registered. Migrated bindings use the current V2 live/reference checks while preserving the legacy URL shape; legacy-only bindings retain their original delivery checks. Migrated records are excluded from legacy public fallback queries, preventing unpublished content from resurfacing. Public loaders never fall back to drafts.

## Migrations 0011 and 0012

`0011_content_studio_v2.sql` follows the existing 0009 editorial-media and 0010 pending-upload migrations.

It adds:

- Optional central media tags, internal notes, required credit, usage-restriction and expiry fields.
- `studio_documents`, `studio_revisions`, `studio_releases` and `studio_media_references`.
- Immutable history/reference guards, exact release bindings, active-reference trash protection, and publication-time media restriction guards.

It copies non-fixture announcements/events and all their revisions, preserves document/release IDs, title/body/timing/history and live/scheduled pointers, and maps both approved and pending image attachments to their existing media asset. Existing D1 records, OAuth accounts, R2 objects and approval history are retained. There is no reseed/reset, new dependency or new binding.

Apply using the established migration ledger after reviewing/backing up the target local state:

```powershell
cd website
npm.cmd run db:migrate:local
```

The script forces `--local` and `content_dev`; it cannot run a remote migration. Migration files are applied once through Wrangler's migration ledger. Do not run the raw ALTER statements repeatedly. Isolated tests apply migrations transactionally; a failed batch rolls back. Remote migration/deployment/Cron activation require separate authorization. Keep application cutover and migration coordinated; do not use the old publisher against V2-managed records after cutover.

Read-only inspection during the continuation found that the persistent local database had **already applied an earlier 0011 schema** and contained V2 records. The earlier handoff's claim that persistent local state was unmigrated was incorrect. The applied schema lacked a late-draft image-release cutoff and two release guards. Existing local data was preserved; 0011 was not rerun or rewritten.

`0012_studio_release_safeguards.sql` is the additive forward fix. It adds `media_assets.release_invalidated_at` and installs immutable execution, exact release-binding and media restriction guards. It supports both the observed early 0011 schema and the late draft in the repository. Optional late-draft `public_release_after` values remain effective through compatibility reads; no existing cutoff is silently cleared. Legacy image alt text is read from its immutable original presentation without rewriting historical snapshots.

Before applying 0012 locally, a consistent SQLite backup was created under the ignored `.wrangler/checkpoints/studio-v2-resume/local-db-before-0012/` directory and passed its integrity check. The local-only migration script applied 0012 successfully. A comparison verified unchanged existing values across 29 application tables, and a second run reported no migrations pending. No persistent R2 objects, remote bindings or production resources were modified. These database checkpoints contain private local data and must remain ignored.

Existing `CONTENT_DB`, `MEDIA_BUCKET` and Discord/session/CSRF settings remain required. The Worker scheduled handler now invokes the V2 sweep. This change does not activate a remote Cron schedule or change production bindings.

## Retired interfaces and compatibility code

The route registry no longer exposes old announcement/event editor modules, approval/rejection actions, review queue actions, content-image authorization or the old media picker. Old news/event/workflow/review GET bookmarks redirect into V2; they do not register old POST actions. Approval counts were removed from Overview.

Legacy service/read helpers and unregistered source modules remain available for historical regression tests and data compatibility. They are not a second exposed staff workflow. A proposed bulk archival of core legacy source/tests in the previous session was rejected by automatic approval review because it risked breaking existing functionality; no bulk move was performed. The continuation preserves those uncommitted sources and verifies retirement at the route/build boundary. Physical archival is optional follow-up work, not a prerequisite for using V2. Legacy tables are retained for audit/history, not used as V2 approval gates.

## Validation and manual checklist

Run from `website/`:

```powershell
node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types tests/control-build.mjs
node --experimental-strip-types tests/studio-v2-worker.mjs
git diff --check
```

Historical approval service tests intentionally remain as migration/compatibility regressions. V2 tests cover direct Moderator publication, migration with existing published imagery, live/private isolation, shared media reuse, metadata, gallery credits, collection publication, CSRF, 409 recovery, immutable history, rights suppression, trash protection, event defaults, Cron and unpublish. Upgrade tests cover both 0011 schema variants, preservation of data/R2 inventories and pre-existing restrictions. Built-route checks also exercise mocked OAuth, non-staff boundaries, logout revocation and pagination without overlapping records. Old standalone 05D Worker scripts target retired routes; use the V2 Worker check for the current routes.

Continuation validation: the full serial regression run passed 104 tests. Two subsequently added Media Library UI tests also passed, covering loading/search races and preserving dialog input after network/save/trash failures. Typecheck, production build, built-route checks, built workerd/Cron tests and `git diff --check` passed. The Worker suite now also verifies friendly server-side DST validation and delivery through the newly restored release after clearing expiry.

Browser review used the actual editor and Media Library components in an isolated fixture with mocked media requests at 1440/390/320px. It checked overflow, picker search focus/select/Escape focus restoration, drag/drop, preview, cover removal, absence of nested forms, library network/conflict errors, metadata preservation and dialog focus restoration. Desktop/mobile screenshots were inspected, including the official SVG mark. This does not replace a real authenticated session or screen-reader testing.

Manual local checks before release:

1. Sign in as Moderator, Administrator and Owner; verify member/anonymous denial.
2. Upload, replace and remove a cover in a post and event, including invalid files and network failure. Save formatted content with an inline library image; preview and publish.
3. Find that upload in Media Library. Edit creator metadata, reuse the same image in showcase/banner/gallery and confirm credits appear only in gallery unless mandatory attribution is set.
4. Reorder, replace, hide and remove collection entries; preview and publish each collection on desktop/mobile. Verify long text and images retain their aspect ratio.
5. Save a private replacement and verify public text/media remain live. Try a stale second tab, restore history, unpublish and archive.
6. Schedule/cancel a release across Toronto DST boundaries and explicitly trigger local Cron. Check role revocation, image restriction/expiry, reference-protected trash and restore.
7. Verify Tab/Shift+Tab, Escape, modal focus restoration, sticky toolbar, reduced motion and screen-reader feedback. Review meaningful alt text and required third-party licences.

Known limits: previews use the shared safe text/image rendering but do not reproduce the full public page shell; cropped/focal-point editing, physical purges, bulk legacy source archival, a public submission portal and a new public event-detail page are not included. Gallery is staff-curated. No commit, push, merge, deployment, remote migration or teaser-site change was performed.
