# Private Media Library (Task 04A)

The existing `feature/public-website-routing` implementation is preserved. `/control/media` is the first available management tool. Moderator, Administrator and Owner accounts use the existing unified Discord login, site sessions, current staff assignments and CSRF checks. Ordinary members and anonymous visitors receive no media metadata or image bytes.

## Local setup only

From `website/`:

```sh
npm install
npm run db:migrate:local
npm run dev:content
```

Migration `0006_private_media.sql` adds assets, attribution, three independent permission records, and content usage references. It does not replace content/authentication tables or staff assignments. The existing migration command selects `content_dev` and `--local`; it cannot apply remote migrations. No media fixtures or staff accounts are inserted by migration.

`wrangler.jsonc` binds `MEDIA_BUCKET` to `carrottcrunch-media-local` **only in `env.content_dev`**, with `remote: false`. D1 remains the existing local `CONTENT_DB`. Wrangler/Vite emulate and persist storage under `website/.wrangler/`; no bucket creation, Cloudflare account or remote binding is needed. Neither D1 nor R2 is configured in the default production environment. Default builds intentionally fail closed for media access without bindings.

Merge the existing `.dev.vars.example` values into ignored `.dev.vars.content_dev`. Configure the existing Discord client and callback; see [unified authentication](unified-authentication.md) and [staff authentication](staff-authentication.md). The callback remains `/control/auth/callback`. For localhost use the exact local origin (normally `http://localhost:5173`); for Codespaces use its HTTPS forwarded origin, matching `CONTROL_ORIGIN` and the Discord Developer Portal callback. A configured initial Owner can sign in using the existing one-time bootstrap; accounts are not made staff by uploading or registering. No new OAuth scopes or credentials are needed.

Never commit `.dev.vars*`, storage state, session cookies or approval evidence containing secrets. Do not run deployment scripts or remote Wrangler operations for this milestone.

## Storage and validation

Uploads are single JPEG, PNG or WebP files, up to 20 MiB (20 × 1024 × 1024 bytes). Images also have a 4096-pixel side limit and a 4,000,000-pixel total limit to bound Worker decoder memory. Animated PNG/WebP, SVG, HTML, unsupported formats, invalid envelopes, truncated images and decoder failures are rejected. The server examines actual bytes and dimensions, then fully decodes through `@cf-wasm/photon` (Rust/WASM); filename extensions and browser MIME labels do not establish file type. Metadata and multipart request bodies have separate bounded size limits.

Originals and freshly encoded, metadata-free PNG previews use generated UUID storage keys in a private prefix. Original filenames are display-only, with path/control characters removed. Originals are retained privately and have no HTTP delivery endpoint. `/control/media/:assetId/preview` authorizes the current staff session on every request and looks up only the stored preview key for a validated asset identifier. It does not accept arbitrary storage keys. All private responses use `private, no-store`, `Vary: Cookie`, `nosniff`, no-referrer and frame restrictions. No tokens, storage keys or private staff records are returned to public loaders.

The preview pipeline is private and is not a public publishing system. Future public delivery must create separate sanitized derivatives, use separate delivery/storage rules, verify current consent and attribution at publication time, and never expose these originals. There is no public R2 domain, publishing endpoint, image cropper, bulk uploader or member-upload capability.

R2 and D1 cannot share a transaction. An upload writes its private objects, then atomically inserts metadata, default pending permissions and an audit record. If insertion fails, it attempts to delete only that failed upload's objects. If R2 cleanup itself fails, an inaccessible private orphan can remain; future operator reconciliation must handle this, without deleting accepted assets. No cleanup/purge job exists in this milestone.

## Consent, edits and deletion

Upload does not authorize any use. Gallery, homepage and external-promotion permissions start `pending` independently. Recording approval requires a rights holder, verifiable evidence, reviewing staff Discord ID and review timestamp; optional UTC expiry and conditions are retained. Creator attribution can explicitly allow anonymity. Source URLs are HTTPS references only: the application does not fetch them.

`publicationEligibility` is a conservative prerequisite check, not a publishing authorization endpoint: it rejects trash, incomplete alt text/attribution/provenance, missing/revoked/expired approval, and any conditions that need human review. Future publishers must also verify evidence, any anonymity authorization, current staff permission, and sanitized delivery. Approval for one purpose never grants another.

Metadata and permission edits use optimistic versions and a D1 transaction. Immutable existing `audit_records` record upload, before/after metadata and permission details, trash and restoration, with the acting Discord ID. These are staff/operator data, not public content. Significant changes fail if their audit write fails.

Trash retains both objects and all metadata. Recovery is available through the tool for 30 days, measured as UTC epoch milliseconds. After that deadline the tool cannot restore the asset, but **nothing is automatically purged**. Permanent deletion is unavailable and blocked by a database trigger. Future retention/erasure policy and purge tooling require separate work.

Content usage references block trash in both server utilities and database triggers, including concurrent edits. Reference insertion/reassignment to trashed assets is blocked. There is no reference-creation or publishing interface yet; future publishers must maintain this table transactionally. Consent revocation is retained even if an asset has references; future publishers must react to revocation rather than treating an existing reference as permanent permission.

## Validation and manual checks

```sh
npm run test
npm run typecheck
npm run build
node --experimental-strip-types tests/control-build.mjs
node --experimental-strip-types tests/media-worker.mjs
```

The main suite uses isolated, non-persistent local D1/R2 and generated fictional pixels. It covers migrations, real decode and format/size limits, authorization and CSRF, all staff roles, member denial, expiration/revocation, missing bindings, metadata/permissions, consent eligibility, searches, references, stale edits, immutable auditing, recovery deadlines, failed-upload compensation, and request bounds. Existing public-content/OAuth/navigation tests remain in place.

The post-build media test runs the built application and WASM decoder in actual local `workerd`, exercising HTTP uploads, private previews, CSRF failures, trash/restore, revocation, public routes and the existing Discord invite. No real Discord calls or production resources are used. Run this after the build, not against stale output.

Manual browser checks still required: real Discord sign-in for a configured staff identity and ordinary member; desktop/mobile sidebar and keyboard focus; upload progress/errors and file chooser; title/filename search, image-type filtering and paging; details/alt text/approval editing and stale-edit messaging in two tabs; previews after logout/revocation; trash/restore and content-reference messaging. Test representative phone/camera JPEGs, PNGs and WebPs within the documented limits, and reject an oversized/animated/unsupported file. Verify the homepage carousel, anchors, public News & Events, account menu and Discord joining remain unchanged. Network errors retain form input so a staff member can retry; uploads require JavaScript for the CSRF header, while metadata forms work without JavaScript.

## Affected files

- `migrations/0006_private_media.sql`: additive asset, attribution, permission and usage-reference schema, indexes and deletion/reference constraints.
- `app/lib/media-image.server.ts`: bounded content/dimension inspection, full WASM decode and private PNG re-encoding.
- `app/lib/media-db.server.ts`: typed metadata queries, upload storage/compensation, transactional edits/audits, optimistic versions, trash and restore.
- `app/lib/media-access.server.ts`: staff/CSRF gates, private headers and bounded form parsing.
- `app/lib/media-permissions.ts`: reusable consent prerequisites, without storage keys or server bindings.
- `app/lib/cloudflare-context.server.ts`: request-scoped optional media binding type.
- `app/lib/staff-auth.server.ts`: bounded URL-encoded CSRF form reading (256 KiB) to support media approval forms while preserving existing token/origin/session checks.
- `app/lib/dashboard-tools.ts`, `app/components/control-dashboard.tsx`: enabled role-aware Media Library navigation and reusable dashboard content area.
- `app/components/media-fields.tsx`, `app/components/media-error.tsx`: reusable metadata/permission forms and safe error pages.
- `app/routes.ts`, `app/routes/control-media.tsx`, `app/routes/control-media-detail.tsx`, `app/routes/control-media-upload.ts`, `app/routes/control-media-preview.ts`: protected library, search/filter/paging, details/actions, single-image upload and private preview routes.
- `app/app.css`: scoped responsive media styles.
- `wrangler.jsonc`: local-only R2 binding.
- `package.json`, `package-lock.json`: Worker-compatible Photon decoder and its small internal helper; no unrelated dependency changes.
- `tsconfig.cloudflare.json`: explicit `.ts` imports for shared server utilities, allowing the existing Node native TypeScript test runner to load them directly.
- `tests/media.test.mjs`, `tests/media-worker.mjs`, `tests/navigation.test.mjs`: media security/lifecycle tests, compiled Worker HTTP checks and enabled-navigation regression assertions.
- `docs/media-library.md`: setup, security model, limitations, file manifest and manual validation instructions.

## Recorded validation

- `npm run db:migrate:local`: migration 0006 applied successfully to the existing local database; prior migrations/staff/content were preserved.
- `npm run test`: 30 tests passed, zero failures.
- `npm run typecheck`: passed.
- `npm run build`: passed, including the Worker WASM bundle; storage access code and the WASM decoder remain server-side.
- `node --experimental-strip-types tests/media-worker.mjs`: passed against the built Worker with isolated local D1/R2.
- `node --experimental-strip-types tests/control-build.mjs`: passed authentication/member/control/logout regression checks and client secret-code checks.
- `git diff --check`: passed.

No remote resources, production migrations, DNS changes, deployment, push or merge were performed. Real browser and live Discord checks listed above remain outstanding.
