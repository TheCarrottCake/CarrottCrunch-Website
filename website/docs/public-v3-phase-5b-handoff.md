# Public V3 Phase 5B — About Memories handoff

Implementation is uncommitted on `feature/cinematic-redesign-v3`, based on
`84c62cd` (completed Phase 5A). **Finalized locally: migration 0013 has been
applied after verified backup and preservation checks. No remote migration or
Git checkpoint has been performed.**

## Staff and public behaviour

- `/control/collections/about-memories` has exactly two optional slots:
  `opening` / Community memories and `history` / Shared worlds & moments.
- Reuses V2 uploads, private Media Library picker, toolbar, preview, revisions,
  publication, Toronto scheduling, Cron, role guards and CSRF protections.
  Moderators, Administrators and Owners retain direct V2 publishing permissions.
- Choose/upload, replace, remove and editable descriptions appear with each slot.
  Remove clears the slot, restores focus to Choose from Library, and does not
  delete the asset. Uploads enter the existing shared library; unsaved uploads
  remain reusable there under existing cleanup/trash rules.
- Save private draft preserves the existing live release. Both slots publish
  together. As elsewhere in V2, **Save Changes on live content publishes** after
  confirmation; use More → Save private draft to keep replacements private.
- Unknown slots, extra entry keys, arbitrary URLs/asset identifiers and unrelated
  story/collection fields are rejected. Media manifests are derived server-side,
  using `memory:opening` and `memory:history`, never trusted from submitted JSON.
- Incomplete descriptions can be saved privately. Publication and scheduling
  require descriptive alt text. Length/type/control-character checks apply;
  short, generic and URL-only descriptions are rejected. Staff still need to
  judge factual accuracy and description quality.
- About reads only the current executed live release and its exact revision and
  media references. Revision-bound alt text overrides central Library alt text.
  Delivery continues through existing guarded, no-store derivative endpoints.
- Existing scrapbook geometry and rotations remain. Images fill the frames with
  centred `cover`; original image bytes are unchanged. Mandatory attribution and
  safe source links sit outside the crop. Optional creator credits are not added
  to About. The shared accessible viewer shows the uncropped guarded derivative,
  not the private original. Missing/revoked/expired/unpublished images use the
  existing honest placeholders; failed image requests also restore placeholders.
- Homepage, gallery, approved About story, founder/TCC artwork, Staff Voices
  curation and historical migrations are unchanged. Empty Staff Voices stays hidden.

## File inventory

New application files:

- `app/lib/about-memories.ts`: fixed slot keys/labels shared by presentation.
- `app/lib/about-memories-validation.server.ts`: strict snapshot/release validation.
- `app/lib/about-memories.server.ts`: exact live-release public projection.
- `app/components/about-memories-editor.tsx`: two-slot fields and working preview.
- `app/components/about-memory.tsx`: scrapbook image, fallback, credits and viewer.

Updated application files:

- `app/lib/studio-model.ts`, `studio.server.ts`, `studio-route.server.ts`,
  `studio-media.server.ts`: new kind/snapshot, validation, redirects and unsaved
  image hydration; shared publication and delivery protections remain in place.
- `app/routes/studio-collection.tsx`: existing dynamic route allowlist, About
  context and explicit 503 readiness gate before 0013. No new route registration.
- `app/lib/dashboard-tools.ts`, `app/components/control-dashboard.tsx`: tool link.
- `app/components/studio-editor.tsx`: uses the existing toolbar for the new fields.
- `app/routes/about.tsx`: loader and the two existing scrapbook positions only.
- `app/app.css`, `app/public-v3.css`: narrowly scoped editor/image presentation.

Migration/test/documentation files:

- `migrations/0013_about_memories.sql`.
- `tests/about-memories-migration.test.mjs`, `tests/about-memories.test.mjs`,
  `tests/about-memories-worker.mjs`,
  `tests/fixtures/about-memories-runtime.mjs`.
- `tests/dashboard.test.mjs`, `navigation.test.mjs`, `public-editorial.test.mjs`,
  `studio-v2-ui.test.mjs`: updated navigation/import expectations and slot UI check.
- This handoff. No dependencies, configuration or historical migration edits.

## Migration reconstruction and evidence

0013 creates a replacement table, copies explicit columns, checks symmetric row
equality, drops the original and renames the replacement. It never renames the
original first or edits sqlite_schema. D1-supported foreign-key deferral retains
the cyclic document/release relationships. The migration must run atomically.

Recreates the original list index, extends singleton uniqueness and restores
dependent views/triggers, including the final 0012 binding, live-media and
release-execution safeguards and both legacy/V2 trash guards. Other history and
foreign-key definitions are preserved.

The exact SQL passed disposable D1 tests for early-applied and late-draft 0011
variants upgraded through 0012. Fixtures include legacy content, live, private,
scheduled, unpublished and archived records, collections, media and audit history.
Tests compare every application table row, schema object identities and all
unchanged definitions (normalizing only line endings), and R2 object bytes.
Injected failures immediately after DROP and RENAME roll back all schema and
records. Singleton/unknown-kind rejection, history immutability, cross-document
binding protection and active-reference trash rejection remain effective.

`foreign_key_check` and D1-supported `quick_check` pass. D1's SQL authorizer rejects
both direct and table-valued **full `integrity_check`**. The test also reconstructs
the pre-migration application schema/data in a disposable Python SQLite in-memory
database, runs the exact 0013 SQL there and verifies full `integrity_check = ok`
and no foreign-key violations. This mirror does not certify physical D1 storage.

## Validation results

- **130/130 full regression tests pass** (`npm.cmd test`).
- `npm.cmd run typecheck`, `npm.cmd run build`, `git diff --check`: pass.
- Built-route checks (`tests/control-build.mjs`): pass.
- Current V2 Worker/Cron checks (`tests/studio-v2-worker.mjs`): pass.
- New `tests/about-memories-worker.mjs`: pass against the production Worker,
  disposable D1/R2, fake staff sessions and actual scheduled-event dispatch.
  Covers readiness before migration, Moderator upload/publication, origin/CSRF,
  alt validation, draft isolation, stale input, Cron, unpublish and inactive roles.
- Service tests cover zero/one/two slots, manifest validation, permissions/expiry,
  unavailable images, trash protection, history, restores and publication failure
  preserving live content. Existing V2 suites cover the shared rights-restoration
  and delivery restrictions.
- Edge browser checks at **1440, 1024, 760, 390 and 320px**: no horizontal overflow;
  correct centred crops, portrait source handling, mandatory credits, viewer
  Escape/focus trap/restoration, picker keyboard focus/Escape, remove/choose,
  preview, private draft save, empty/unpublished/revoked fallbacks, hidden Staff
  Voices and preserved founder artwork. Below-the-fold images load lazily.
  Browser uses the built application with disposable D1/R2 and explicitly synthetic
  TEST images, not genuine historical content or real Discord OAuth.

Two older standalone scripts were also attempted and **fail**:

- `tests/publication-worker.mjs` schedules legacy `content_workflows` after all V2
  migrations, but the current Worker Cron processes `studio_releases`; its legacy
  event remains scheduled. Current V2 Cron tests pass.
- `tests/media-worker.mjs` expects retired pre-V2 Media Library wording/routes
  (first failure: “No images in this collection”). Current V2 upload/media checks
  pass. These scripts and the Worker dispatch were not changed in this phase;
  updating obsolete harnesses remains separate maintenance work.

Local review evidence is ignored under `.wrangler/v3-phase5b-review/`:
`browser.log`, `about-1440.png`, `about-390.png`, `editor-1440.png`,
`editor-390.png`. Source checkpoint/hashes are ignored under
`.wrangler/checkpoints/v3-phase5b-before/`. Screenshots are not Git source assets.

## Finalization ? local migration and safety verification

The owner explicitly authorized conditional local application after health,
backup and compatibility checks. The repository development server and its
Worker were identified and paused to prevent concurrent writers. No unrelated
processes were stopped.

- Before application: the persistent ledger ended at **0012**, full SQLite
  `integrity_check` returned **ok**, and `foreign_key_check` returned no rows.
- The current schema matched the tested **early-applied-0011** variant through
  0012. Both exact migration preservation/rollback tests were rerun and passed.
- A consistent SQLite backup was created through SQLite's backup API, which
  includes committed WAL data, rather than copying a live main database file.
  The backup reopened successfully, passed full integrity and foreign-key checks,
  and matched every application table's rows and the complete application schema.
- Verified local backup directory (ignored; never stage):
  `website/.wrangler/backups/phase5b-finalization-20261028T025657Z/`.
  Contains `content-before-0013.sqlite`, `verification.json` and a verified copy of
  all **70 local R2 storage files** under `r2/`. Treat this directory as private.
- `npm.cmd run db:migrate:local` successfully applied **0013_about_memories.sql**
  using the existing fixed `content_dev`, `--local` script. The ledger records
  0013. A second invocation returned **No migrations to apply!**
- Post-application: full SQLite integrity remains **ok**; foreign-key checks are
  clean. All **400 existing application records across 29 application tables**
  match pre-migration row fingerprints exactly. The separate migration ledger
  contains only the expected new migration row. Schema object names and all
  unaffected definitions match; only the document kind CHECK and collection
  uniqueness index changed. Local R2 files matched byte-for-byte immediately
  after migration. After restoring the development server, normal volatile
  WAL/SHM lifecycle changed; all R2 database records and all media blob bytes
  still match the verified backup (66 stable files checked).
- All current regression tests were rerun: **130/130 pass**. Typecheck, build,
  built-route checks, About Memories Worker checks and current V2 Worker/Cron
  checks pass. `git diff --check` passes. The two obsolete standalone legacy
  harness failures described above remain separate maintenance work; this
  finalization did not change application code or those scripts.

The previous raw-file hash drift showed no evidence of database corruption or a
failed migration. An active repository dev server was found, and both persistent
D1 and observability SQLite databases pass health checks. Local request tracing,
SQLite WAL/checkpoint activity and legitimate development writes can change raw
file hashes. The old hash-only checkpoint cannot establish precisely which
historical transactions caused that drift, so retrospective row equivalence is
not claimed. The verified consistent backup and pre/post row comparisons above
now establish a safe migration boundary without resetting or repairing data.

The development server was restored after verification. Public HTTP checks at
its configured origin **http://localhost:5173** return 200 for Homepage, Gallery
and About; both empty scrapbook placeholders, founder artwork and hidden Staff
Voices are intact. The About Memories route correctly returns 403 anonymously;
authenticated route loading, both slots, uploads/selection, publication and draft
isolation pass in the built Worker tests with disposable data. Real staff sign-in
and actual historical-image editorial review remain manual checks. Use localhost
rather than 127.0.0.1 for staff routes because the existing local auth origin is
localhost; no auth or environment configuration was changed.

Protected homepage/gallery components, About copy, Staff Voices curation,
branding SVGs and historical migration hashes still match the prior baseline.
`AGENTS.md.backup` remains untouched. Detailed local-only evidence lives in
`website/.wrangler/phase5b-finalization/` (`safety.json`, test/build/migration logs
and `persistent-http-check.json`); none belongs in Git.

## Git checkpoint readiness

Ready for source review and an explicitly requested checkpoint. All changes are
unstaged; nothing was committed, pushed, merged or deployed. Keep the backup,
`.wrangler/`, environment files, generated build outputs, screenshots and the
unrelated pre-existing `AGENTS.md.backup` out of the checkpoint.

The exact Phase 5B checkpoint paths are listed below. Finalization itself changes
only this handoff in tracked/source scope; the application, migration and test
changes are the preserved Phase 5B implementation.

```text
website/app/app.css
website/app/components/about-memories-editor.tsx
website/app/components/about-memory.tsx
website/app/components/control-dashboard.tsx
website/app/components/studio-editor.tsx
website/app/lib/about-memories-validation.server.ts
website/app/lib/about-memories.server.ts
website/app/lib/about-memories.ts
website/app/lib/dashboard-tools.ts
website/app/lib/studio-media.server.ts
website/app/lib/studio-model.ts
website/app/lib/studio-route.server.ts
website/app/lib/studio.server.ts
website/app/public-v3.css
website/app/routes/about.tsx
website/app/routes/studio-collection.tsx
website/docs/public-v3-phase-5b-handoff.md
website/migrations/0013_about_memories.sql
website/tests/about-memories-migration.test.mjs
website/tests/about-memories-worker.mjs
website/tests/about-memories.test.mjs
website/tests/dashboard.test.mjs
website/tests/fixtures/about-memories-runtime.mjs
website/tests/navigation.test.mjs
website/tests/public-editorial.test.mjs
website/tests/studio-v2-ui.test.mjs
```

## Remaining manual checklist (migration already applied)

1. Open About Memories as each permitted staff role; confirm nonstaff denial.
2. Upload/choose real licensed images; verify their shared Library reuse. Replace
   and remove each slot; confirm the Library originals remain.
3. Enter accurate alt text and inspect mandatory attribution/source. Preview
   landscape and portrait images at desktop/mobile widths; open uncropped viewer,
   Tab/Shift+Tab, Escape and confirm focus returns.
4. Publish empty, opening-only, history-only and both-slot revisions. Check the
   two About frames, founder artwork and surrounding approved copy.
5. Save a private replacement; confirm live images/alt remain unchanged. Test a
   stale editor conflict without losing input, and a history restore as a draft.
6. Schedule via Toronto calendar/quarter-hour options; invoke local Cron explicitly
   and verify one exact revision publishes once. Unpublish and confirm placeholders
   and guarded old image URLs stop delivering.
7. Revoke/expire image rights, verify placeholder without losing About text, and
   confirm clearing restrictions does not resurrect an old release. Test active
   working/scheduled/live reference trash rejection.
8. Review real-image quality, screen-reader descriptions and physical mobile
   interaction. Recheck unchanged homepage/gallery and hidden Staff Voices.

No commit, push, merge, deployment or remote migration was performed. Only the
explicitly authorized, verified local migration was applied.
