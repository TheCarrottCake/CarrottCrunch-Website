# Combined Phase 6 checkpoint - November 11, 2026

Owner has approved the content and structure of Phases 6A, 6A.1 and 6B.
**Public page visual presentation is not final.** The coordinated design pass
is deferred until content/functionality development is complete; it will address
shared identity, page composition, section flow, typography/spacing, personality,
responsive behaviour, accessibility/motion and site-wide navigation consistency.
No redesign is part of this checkpoint.

Correct checkout: `C:\Projects\CarrottCrunch-Website`.
Branch: `feature/cinematic-redesign-v3`. Parent: `898cd5a`.
The older G: checkout and all local data remain untouched.

Authorized local commit message:
`Complete Public V3 Phase 6 and November maintenance`

## Combined scope and reviewed staging allowlist (42 files)

Includes Servers/Create, six-game typed catalog and original CSS graphics,
Section 03 homepage Games preview, latest three-section approved Safety content,
November tooling maintenance, regression coverage and current documentation.
No authentication, Studio, branding, private onboarding or production changes.
Lockfile review confirms Cloudflare/tooling version changes only; other packages
retain versions and integrity hashes, with npm-normalized peer/libc metadata.

```text
AGENTS.md
website/README.md
website/app/components/community.tsx
website/app/components/game-card.tsx
website/app/components/games-preview.tsx
website/app/components/server-card.tsx
website/app/content/games.ts
website/app/content/public-pages.ts
website/app/content/safety.ts
website/app/content/servers.ts
website/app/games.css
website/app/public-v3.css
website/app/routes.ts
website/app/routes/games.tsx
website/app/routes/home.tsx
website/app/routes/public-layout.tsx
website/app/routes/safety.tsx
website/app/routes/servers-create.tsx
website/app/routes/servers.tsx
website/app/safety.css
website/app/servers.css
website/docs/content-studio-v2.md
website/docs/games-css-redesign.md
website/docs/maintenance-2026-11.md
website/docs/phase6-final-checkpoint.md
website/docs/phase6b-safety-proposal.md
website/docs/project-status.md
website/docs/public-v3-phase-5b-handoff.md
website/docs/public-v3-phase5a.md
website/docs/public-v3-phase6a.md
website/docs/public-v3-phase6a1.md
website/docs/public-v3-phase6b.md
website/docs/v3-release-candidate.md
website/package-lock.json
website/package.json
website/tests/fixtures/studio-build-check.mjs
website/tests/games.test.mjs
website/tests/media-worker.mjs
website/tests/public-v3-foundation.test.mjs
website/tests/publication-worker.mjs
website/tests/safety.test.mjs
website/tests/servers.test.mjs
```

## Validation and exclusions

Final regression: 147 passed, no failures/skips. Typecheck and production build
passed. Current built-route/authentication, Studio V2 Worker/Cron and About
Memories Worker checks passed with disposable local bindings. Public-route smoke
checks cover Homepage, Games, Servers/Create, About, Gallery, Safety and Login.
Diff whitespace checks pass. These checks do not certify real Discord sign-ins,
physical devices, genuine content quality or production credentials.

The complete staged diff is reviewed before the authorized local commit, and
the index is checked against this exact allowlist. No broad `git add` operation.
The historical report below remains a record, not the current scope/approval.

Preserve and exclude `AGENTS.md.backup` and six unused original SVG concepts in
`website/public/images/games/`. Exclude .dev.vars/.env files, secrets, local
configuration, .wrangler D1/R2/backups/screenshots/review scripts, node_modules,
build, .react-router, generated types and build caches. No data migration,
reset, reseed, remote operation, push, merge or deployment is authorized.

The next-phase audit is documentation/proposal only and is prepared after this
checkpoint. No next-phase functionality is included or automatically approved.

---

## Historical Phase 6A/6A.1 checkpoint report

# Phase 6 final checkpoint report

> Historical Phase 6A/6A.1 checkpoint snapshot: Phase 6B has since been added uncommitted. Its additional paths and current verification are recorded in the [Safety handoff](public-v3-phase6b.md). The 36-file allowlist below does not include Phase 6B and must not be treated as the full current staging list.

November 10, 2026 (America/Toronto). Awaiting owner approval: nothing staged,
committed or pushed. No deployment, merge, migration or production change.

## Verified checkout and scope

Checkout: `C:\Projects\CarrottCrunch-Website`.
Branch: `feature/cinematic-redesign-v3`.
HEAD: `898cd5a0e86b23a4bc7e1e7ddec1889a21c5a62b`
(`Complete Public V3 Phase 5B About Memories`). Cached remote references agree;
no live remote refresh was performed for this final audit. The older G: checkout
and its changes were not reset, cleaned, stashed, copied or migrated.

Phases 6A and 6A.1 have owner visual approval. Preserve the approved Servers hub,
Create detail page, Games directory and original CSS game compositions.
Homepage order is 01 The CarrottCrunch Way, 02 The Hangout, 03 What We're Playing,
04 Small Blocks. Big Imagination., 05 Fresh From the Patch; Create feature and
closing Discord invitation remain below. Existing anchors and hero are retained.

The typed catalog contains Minecraft, R.E.P.O., Phasmophobia, Overwatch, Roblox
and Satisfactory. Only Minecraft has the CarrottCrunch-hosted Create link.
The three-game preview is curated presentation, not a popularity ranking.
No game artwork, publisher logos, invented activity or extra server listings.
November maintenance includes current documentation and the narrow Cloudflare
tooling/security patch update; no runtime dependency or database schema added.

Diff review restored the original loading-announcement ellipsis after spotting
an encoding error, and corrected historical documentation punctuation. No
approved visual composition changed in this final audit. Safety remains its
existing informational page; Phase 6B is a proposal only.

## Final verification

- `npm.cmd test`: 144 passed, zero failed/skipped.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- `node --experimental-strip-types tests/control-build.mjs`: passed; built
  routes, mocked OAuth, role permissions, CSRF and public/private isolation.
- `node --experimental-strip-types tests/studio-v2-worker.mjs`: passed; isolated
  current Worker publishing/media, scheduling, Cron and unpublish guards.
- `node --experimental-strip-types tests/about-memories-worker.mjs`: passed;
  current built Worker, exact references, conflicts, role guards and real local
  Cron invocation. Expected rejected-request logs are assertion-covered.
- `git diff --check`: passed (Git line-ending notices are informational).
- Index is empty. Intended paths exclude private/local/generated state.

Worker checks use disposable local bindings and synthetic/mock data, not live
Discord, production D1/R2 or production Cron. Historical pre-V2 standalone
media/publication scripts retain their original assertions and are explicitly
not current acceptance harnesses; see November maintenance limitations.

The previously completed visual review covered 1440, 1024, 760, 390 and 320px,
including overflow, card readability, keyboard focus, hover and reduced motion.
This checkpoint audit did not create a fresh browser screenshot set; owner
approval and existing review evidence are retained. Local screenshots are in
`website/.wrangler/games-css-review/` (`home` and `games`, 1440/390/320 variants).
Physical devices, screen readers, real Discord role sign-ins and genuine media
publishing remain manual checks. Exact modpack versions and authorized server
screenshots remain unavailable, accurately presented as such.

## Proposed commit

`Complete Public V3 Phases 6A and 6A.1 with November maintenance`

Suggested body: Preserve approved Servers/Create layouts; add the six-game CSS
catalog and Section 03 homepage preview; include current Cloudflare maintenance,
regression coverage and handoffs. Record the Phase 6B Safety proposal without
implementing new policy or reporting functionality.

## Exact proposed staging allowlist (36 files)

This is a review list, not a staging operation. `AGENTS.md` is the maintained
project-rules update; its backup is excluded. Review these paths before any
subsequent explicit commit authorization.

```text
AGENTS.md
website/README.md
website/app/components/community.tsx
website/app/components/game-card.tsx
website/app/components/games-preview.tsx
website/app/components/server-card.tsx
website/app/content/games.ts
website/app/content/servers.ts
website/app/games.css
website/app/public-v3.css
website/app/routes.ts
website/app/routes/games.tsx
website/app/routes/home.tsx
website/app/routes/public-layout.tsx
website/app/routes/servers-create.tsx
website/app/routes/servers.tsx
website/app/servers.css
website/docs/content-studio-v2.md
website/docs/games-css-redesign.md
website/docs/maintenance-2026-11.md
website/docs/phase6-final-checkpoint.md
website/docs/phase6b-safety-proposal.md
website/docs/project-status.md
website/docs/public-v3-phase-5b-handoff.md
website/docs/public-v3-phase5a.md
website/docs/public-v3-phase6a.md
website/docs/public-v3-phase6a1.md
website/docs/v3-release-candidate.md
website/package-lock.json
website/package.json
website/tests/fixtures/studio-build-check.mjs
website/tests/games.test.mjs
website/tests/media-worker.mjs
website/tests/public-v3-foundation.test.mjs
website/tests/publication-worker.mjs
website/tests/servers.test.mjs
```

## Explicit exclusions

Leave `AGENTS.md.backup` and the six unused original SVG concepts under
`website/public/images/games/` untouched and unstaged. They are historical
unreferenced concepts, not current game-card dependencies.

Never include `.dev.vars*`, `.env*`, credentials, private local configuration,
`.wrangler/` (D1/R2, backups, review scripts and screenshots), `node_modules/`,
`build/`, `.react-router/`, generated worker types or TypeScript build state.
No ignored private content was copied into these reports. No database changes
or migration files belong to this checkpoint.

## Phase 6B handoff

See [Safety design and content proposal](phase6b-safety-proposal.md). It separates
four established Minecraft expectations and existing account-safety guidance
from proposed community policies, reporting, staff duties and appeals requiring
owner decisions. Review that proposal before implementation. Approval of this
checkpoint does not authorize deployment, a push or new Safety policy.
