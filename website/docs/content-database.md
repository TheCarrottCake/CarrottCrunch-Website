# Local News & Events database foundation

This milestone adds local Cloudflare D1 persistence only. Existing public page content and the Discord joining flow are unchanged. No remote database, public mutation endpoint, OAuth, permissions, editor, or production binding is provided.

## Setup

Use the repository's Node 24 development environment and installed dependencies. From `website/`:

```sh
npm run db:migrate:local
npm run db:seed:local  # optional: fictional development fixtures only
npm run dev:content  # optional: website with the local CONTENT_DB binding
```

No Cloudflare login or remote database creation is needed. `npm run dev` still uses the original environment without a content database. The named `content_dev` environment contains a dummy database UUID, `remote: false`, and the `CONTENT_DB` binding; the default production configuration has no D1 binding. Do not deploy the development environment or substitute production IDs into it.

The Vite plugin selects this development environment using `CLOUDFLARE_ENV=content_dev`. Local commands use the same Wrangler configuration and default `.wrangler/state/v3` persistence directory. That directory is ignored by Git. Local state survives restarts; tests use separate nonpersistent databases and never touch it.

The migration/seed wrapper accepts exactly one fixed operation and rejects extra arguments, including `--remote`, configuration overrides, and alternate SQL files. Every database operation it launches explicitly includes `--local --env content_dev`. Seeds are never part of startup, migrations, builds, or deployment scripts. Seed SQL is not a production migration and must not be manually executed against a remote database.

Run migrations again safely: Wrangler tracks applied files in `d1_migrations`. Do not edit an applied migration; add a numbered migration for later changes. To inspect local data:

```sh
npx wrangler d1 execute carrottcrunch-content-local --env content_dev --local --command "SELECT id, kind, title, state, is_fixture FROM content_items;"
```

Both seed reruns and migration reruns are safe. Four fixtures (published/draft announcement and event) have fixed identifiers, clearly fictional titles, and `is_fixture=1`. Seed inserts use conflict-on-ID no-ops and never overwrite existing content. Slug or constraint collisions fail rather than replacing records. Public queries exclude fixtures even if their state is `published`.

## Schema and publication

- `content_items`: stable UUID, unique slug, kind, title, plain-text body, publication state, fixture flag, creation/update/publication timestamps.
- `announcements`: announcement subtype linked by a checked composite foreign key.
- `events`: event subtype, UTC start/end instants, and timezone; end must follow start.
- `content_revisions`: immutable JSON snapshots, increasing per-content revision numbers, actor identifier, timestamp.
- `audit_records`: immutable action/details records with actor identifier and optional content reference. Actions currently allowed: created, updated, state_changed.

Foreign keys prevent orphan subtype/history records. Publication, event-start, and audit indexes support lookup/order. History tables reject updates/deletes; this is application-level audit history, not a tamper-proof record against database administrators. Future content operations must append a snapshot and audit record in the same transaction as each change. No edit/publish/delete operation is implemented yet.

States are `draft`, `review`, `scheduled`, `published`, and `archived`. Scheduled and published rows require `published_at`. A public query returns only `published` non-fixture content whose publication timestamp is at or before the supplied server time. Scheduled content is not automatically promoted. Past events remain in published-event results; chronological ordering is by start time. Announcements sort newest publication first; UUID breaks ties. Query limits default to 20 and are restricted to 1–100. Pagination and scheduling jobs are future work.

All times are integer **UTC epoch milliseconds**, never ambiguous local date strings. An event additionally stores an **IANA timezone** such as `America/Toronto`. Internal event creation validates the zone with `Intl.DateTimeFormat`; SQL enforces a nonempty zone but cannot validate the IANA registry. Any future import/write path must perform the same validation. Future editors must explicitly resolve daylight-saving gaps/overlaps before converting local input to UTC. The schema does not infer a community timezone.

Bodies are plain text; future rendering should use React text nodes, not raw HTML. Rich-text schemas, sanitization, attachments, and rendering are outside this milestone.

## Server utilities

`app/lib/content-db.server.ts` is server-only. Worker bindings are passed through React Router’s request-scoped `RouterContextProvider` using `contentEnvironmentContext` and have an optional `CONTENT_DB` type so the unchanged default environment still runs without a database. Future loaders can use:

```ts
import { contentEnvironmentContext } from "../lib/cloudflare-context.server";
import { requireContentDatabase, getPublishedAnnouncements, getPublishedEvents } from "../lib/content-db.server";

const db = requireContentDatabase(context.get(contentEnvironmentContext));
const announcements = await getPublishedAnnouncements(db);
const events = await getPublishedEvents(db);
```

Missing database configuration throws an explicit error; no existing loader calls these utilities yet. Public helpers select only public fields and bind all query parameters. They do not expose audit records, revisions, actors, or draft content.

Internal `createAnnouncementDraft` and `createEventDraft` helpers generate UUIDs and atomically insert the draft, subtype, first revision, and creation audit record via D1 batch. `actorId` is supplied by the caller; it is not authenticated in this milestone. These helpers are not reachable through public actions or endpoints. Authorization must be implemented before connecting them to staff-facing routes. Store no credentials or secrets in bodies, snapshots, actor IDs, or audit details.

## Validation

```sh
npm run test
npm run typecheck
npm run build
```

Tests use Wrangler's local D1 proxy with `persist: false` and `remoteBindings: false`, apply the actual migration SQL, and exercise database constraints, atomic rollback, immutable history, publication filtering, event validation, fixture reruns, and wrapper flag rejection. Existing Discord validation tests remain included. The test suite does not simulate staff permissions or confirm Discord's external availability.

If Wrangler cannot write its optional log file in a restricted environment, set `WRANGLER_LOG_PATH=/tmp/carrottcrunch-wrangler`. Local D1 CLI commands also need permission to bind localhost sockets. Never use deployment as validation.

Manual browser checks remain: visit/reload all existing public routes, check desktop/mobile navigation and homepage anchors/carousel, confirm the official Discord widget and `/join` link, and repeat using `npm run dev:content`. Database content is intentionally not rendered yet.

## Future implementation

Explicit authorization is still required before provisioning or binding production D1 and applying remote migrations. Later milestones need authorized staff identity/permissions, validated edit/publish operations with revision/audit writes and concurrency handling, content rendering/loaders, pagination, and scheduling policy. No DNS, CarrottCrunch.ca deployment, R2, or other production resources were changed.

References: [D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [D1 batch operations](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Vite plugin environments](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/).

### Task 02A verification results

- `npm run db:migrate:local`: both migrations applied to persistent local D1; a second run reported no migrations to apply.
- `npm run db:seed:local`: succeeded twice; isolated database tests also confirmed stable row counts on rerun.
- `npm run test`: all 10 tests passed, including the existing Discord tests.
- `npm run typecheck` and `npm run build`: passed after adapting the Worker binding handoff to React Router 8's typed context provider.
- `git diff --check`: passed.
- Local HTTP smoke checks with `npm run dev:content`: all eight public routes returned 200, no fixture text appeared, homepage hash targets and Discord widget remained present, and `/join` retained the configured official invitation.

The initial CLI attempt was blocked by sandbox log/socket permissions; local D1 commands and final validation succeeded with those local permissions available. No remote D1 operation or deployment was run. Browser interaction and visual checks remain manual.

## Task 02B follow-up

The read-only public experience is now connected; see [Dynamic News & Events](dynamic-news-events.md). Migration 0003 adds event cancellation, and the seed set now has eight fixtures. Normal public queries still exclude fixtures; explicit development demonstration mode selects labelled fixtures only and is disabled in production builds. The original Task 02A verification results above remain a historical record.
