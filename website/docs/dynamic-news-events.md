# Dynamic News & Events (Task 02B)

Task 02A was verified before implementation: all 10 existing tests passed against isolated local D1, and persistent local D1 reported migrations 0001/0002 already applied. Earlier public-page and Discord work in the working tree was preserved.

## Local setup and demonstration

From `website/`:

```sh
npm run db:migrate:local
npm run db:seed:local
npm run dev:content
```

Migration `0003_event_cancellation.sql` adds `events.event_state` (`active` or `cancelled`) and an index. Cancellation is separate from publication: published cancellations remain visible, while draft or scheduled events never become visible merely because they are cancelled. Only local migrations were applied; production has no D1 binding.

Normal mode excludes all fixture records and displays honest empty states if only fixtures exist. To explicitly enable fictional content, add this line to the ignored local file `.dev.vars.content_dev` (preserve any existing settings):

```dotenv
CONTENT_DEMO_MODE="true"
```

Restart `npm run dev:content`. Open `/updates` and follow a news article link; the homepage also shows demonstration news and upcoming events. All fixture pages show a prominent fictional-development notice, individual items are labelled, and page metadata requests `noindex, nofollow`. Demonstration mode shows **fixtures only**, so real and fictional content are not mixed. Both modes still require published state and elapsed publication time, and never read revision snapshots. A URL/query parameter cannot enable this mode.

Disable demonstration by removing that line or setting it to `false`, then restart. Production builds hard-disable demonstration regardless of binding value. Seeds are still manual, repeatable, and local-only; the new fixture records supplement the original four with rich-text, completed/cancelled event, and future-publication examples. No fictional content is inserted during startup/build. The temporary flag used for verification was removed afterward.

`npm run dev` continues to work without D1: existing pages remain available, the homepage and updates page explain that news/events are not available yet, and article requests return a safe unavailable page with HTTP 503.

## Public experience and queries

- `/updates`: published announcements newest first, followed by event groups. Up to 100 announcements and 100 events per request; pagination is future work.
- `/updates/:announcementId`: stable, shareable UUID URL. Titles/slugs may change without changing the URL. Unpublished, future-dated, fixture-in-normal-mode, and missing articles all return HTTP 404 without revealing private content.
- `/`: the existing news column shows the latest three published announcements and next three upcoming events. The hero, carousel, server card, gallery, section anchors, official Discord widget, and join actions are preserved.

Public SQL explicitly selects current published fields; audit records, actor IDs, revision JSON, and draft/future records are excluded. Query values are bound parameters. Revisions are not used as a fallback for published bodies. Future staff publishing must maintain the current public row separately from unpublished revision snapshots.

Event statuses are computed from one server timestamp per load: cancelled overrides timing; completed means end <= now; in progress means start <= now < end; otherwise upcoming. Active current/upcoming events sort by start ascending, completed events by end descending, and cancellations follow. Homepage upcoming queries exclude cancelled, completed, and in-progress events before applying the limit. Statuses refresh on navigation/reload, not on a live timer.

Dates use UTC epoch milliseconds in storage, ISO instants in `<time datetime>`, and the stored IANA timezone for event display. Each endpoint includes its full date/time and numeric UTC offset, followed by the named timezone. This remains accurate across daylight-saving changes and independent of the visitor's timezone. Publication dates display explicitly in UTC.

## Safe rich text

The existing `body_text` supports a deliberately restricted Markdown subset: paragraphs, `##`/`###` headings, bullet lists, bold, emphasis, inline code, and links. Raw HTML is always escaped by React; there is no `dangerouslySetInnerHTML`, embedded media, custom HTML attributes, or script execution. Links allow only HTTPS destinations without credentials and ordinary site-relative paths; unsafe links become text. Arbitrary HTML/JSON editor formats and nested Markdown syntax are not supported. News excerpts and metadata are escaped text.

## Availability and metadata

Missing database configuration has a distinct friendly message. Query failures produce generic unavailable states without exposing SQL/errors; updates responds 503 on query failure, and the homepage retains its other content. Article error boundaries distinguish not-found from unavailable. Empty connected databases show empty states. Client navigations announce loading and mark the main landmark busy while preserving its focus/skip-link behavior.

Article titles, descriptions, Open Graph article metadata, publication time, and Twitter summary metadata are included. Normal article Open Graph URLs target the planned registered `https://carrottcrunch.ca` domain. No DNS, canonical-host redirects, hosting, or deployment changed. Demonstration pages omit production article URLs and request no indexing.

## Files affected

- `app/lib/content-db.server.ts`: publication-filtered single-article/list queries, event ordering/upcoming filtering, fixture opt-in, and public DTOs.
- `app/lib/public-content.server.ts`, `app/lib/content-demo.ts`, `app/lib/event-display.ts`: loader orchestration, development gating, availability, status and timezone formatting.
- `app/components/content-body.ts`, `app/components/news-events.tsx`: safe rich text, reusable news/events presentation, notices.
- `app/routes/updates.tsx`, new `app/routes/news-article.tsx`, `app/routes/home.tsx`, `app/routes.ts`: loaders, article route, metadata, dynamic public content.
- `app/routes/public-layout.tsx`, `app/app.css`: accessible navigation loading status and scoped content styling.
- `migrations/0003_event_cancellation.sql`, `seeds/development.sql`, `wrangler.jsonc`: local cancellation schema, additional fictional fixtures, disabled-by-default demonstration setting.
- `tests/public-content.test.mjs`, `tests/content-db.test.mjs`: safe-rendering, visibility, ordering, cancellation, DST, demo-gate tests and updated fixture assertions.
- `README.md`, this file, and the Task 02A foundation document: setup and milestone notes.

## Validation and remaining work

Commands: `npm run test`, `npm run db:migrate:local`, `npm run db:seed:local`, `npm run typecheck`, `npm run build`, and `git diff --check`. Test cases use actual nonpersistent local D1 and never operate on a remote database.

Local HTTP checks exercise demonstration lists/articles, Upcoming/Completed/Cancelled groups, escaped script markup, metadata, hidden draft/future fixtures, article 404s, homepage teasers, preserved anchors/widget/invitation, and all previous public routes. Normal-mode checks confirm fixture exclusion and empty states. No production migrations, remote database creation, public mutations, authentication, uploads, push, merge, or deployment were performed.

Manual browser testing remains: desktop/mobile visual layout, keyboard/focus/skip links, loading announcements under network throttling, navigation/back/forward and article URL reloads, carousel controls/rotation/reduced motion, Discord widget and external invitation, and event dates across timezones. Pagination, editing/publishing authorization, scheduling, and full editor-format support remain future milestones.

### Recorded results

All 13 tests passed. `npm run typecheck`, `npm run build`, and `git diff --check` passed. The local cancellation migration and seed command succeeded. Demonstration-mode HTTP checks passed for lists/articles, safe rich text, metadata, all requested event groups, hidden drafts/future content, and preserved public/Discord routes. Normal-mode HTTP checks passed for fixture exclusion (including attempts to enable it by query string), empty states, fixture article 404s, and `Cache-Control: no-store`. The original environment without D1 returned intact homepage/updates pages with unavailable notices and a safe article 503, all uncached. Temporary test servers were stopped and the temporary demonstration flag file was removed.

A transient React Router HMR warning occurred while route exports changed in an already-running development server. Fresh-server HTTP checks and the production build passed. Restart the development server if that warning appears; browser client navigation after restart remains part of the manual checks.
