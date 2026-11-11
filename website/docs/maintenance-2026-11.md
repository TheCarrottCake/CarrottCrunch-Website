# November 2026 maintenance audit

Verified November 10, 2026 (America/Toronto). See [living status](project-status.md).

## Repository and environment

The intended checkout already existed at `C:\Projects\CarrottCrunch-Website`.
It is on `feature/cinematic-redesign-v3`, at Phase 5B commit
`898cd5a0e86b23a4bc7e1e7ddec1889a21c5a62b`. `git ls-remote` independently
confirmed the same remote branch tip. Local tracking comparison is 0 ahead /
0 behind. Phase 5A is `84c62cd`. Tracked files were clean before maintenance;
`AGENTS.md.backup` was the sole untracked file and remains untouched.

The initial G: checkout is the older `feature/public-website-routing` branch at
`81ea75e`, with substantial pre-existing changes. It was not switched, reset,
stashed, cleaned, merged or used as V3 source. Preliminary checks there do not
count as V3 validation. Only audit logs created by this task were removed there.
No private database, media, environment or configuration was copied between
checkouts, and no new worktree was necessary.

Node `26.13.0` and npm `11.6.1` are operational. Node satisfies the installed
Vite (`^20.19.0 || >=22.12.0`), React Router dev (`>=22.22.0`) and Wrangler
(`>=22.0.0`) engine requirements. Node type definitions target 22; this is a
compile-time target, not a claim that every Node 26 API is typed. PowerShell
blocks `npm.ps1`; `npm.cmd` works without changing execution policy. The
POSIX-style `dev:content` script needs the documented PowerShell environment
assignment. No application or Cloudflare configuration was changed.

Existing ignored local environment files and persistent D1/R2 are present.
Secrets were not displayed; presence does not establish credential validity.
Read-only SQLite `quick_check` returned `ok`; `foreign_key_check` returned no
rows. Latest ledger entry is `0013_about_memories.sql`, timestamp
`2026-10-28 02:58:01` UTC, or October 27 at 22:58:01 Toronto time. The local R2
storage directory contains 70 files; file presence is not a full media inventory
or byte-integrity certification. No migration, seed, reset, repair or persistent
D1/R2 mutation was performed. No remote database was accessed.

## Documentation corrections

- Added current guidance above the original README/template and milestone notes.
  Historical setup/deployment examples remain history, not current authorization.
- Added current status notes to Content Studio V2, release-candidate readiness,
  Phase 5A and Phase 5B handoffs, preserving original records and test counts.
- Updated AGENTS migration/checkpoint guidance and corrected the brand-spelling
  instruction to two t characters. Preserved the official asset and auth rules.
- Added a living project-status document and this dated audit/Phase 6 proposal.
- Labelled the two pre-V2 standalone Worker harnesses as historical. Their
  assertions and application security checks were not changed or removed.

Content Studio V2 and Public V3 Phases 1-5B are implemented and committed.
Staff Voices remains hidden: its real curated contribution list is empty.
Homepage/gallery retain approved cropped, full-bleed presentation, with
uncropped full-image viewing. Approved About writing is unchanged.

## Dependency audit and focused correction

Initial npm audit reported four affected package entries: one high and three
moderate. These are the development-tooling dependency chain
`@cloudflare/vite-plugin -> wrangler/miniflare -> undici`, not four separate
application defects. Initial `npm audit --omit=dev` reported zero advisories.
Undici `7.29.1` was affected; patched 7.x begins at `7.30.1`, including the
[excessive content-encoding advisory](https://github.com/advisories/GHSA-xjj6-f33q-929c)
and [TLS callback advisory](https://github.com/advisories/GHSA-2m5v-pch6-74hx).

Applied only a compatible Cloudflare tooling pair, within existing major lines:

| Package | Before | After |
| --- | --- | --- |
| Cloudflare Vite plugin | 1.63.1 | 1.66.0 |
| Wrangler | 4.149.0 | 4.154.0 |
| Transitive Miniflare | 5.20261006.1-alpha | 5.20261023.1-beta |
| Transitive Undici | 7.29.1 | 7.30.1 |
| Transitive workerd | 1.20261006.1 | 1.20261023.1 |

The plugin pins the matching Wrangler/Miniflare versions; the new plugin accepts
Vite 8. This avoids forcing a transitive override. The existing prerelease
Miniflare line advances from alpha to beta; all current Worker integrations
were therefore rerun. Related ws/cookie and platform binaries follow the package
graph. No new direct dependencies or application runtime upgrades were added.
Install lifecycle scripts were disabled; required type generation ran explicitly.
Three pre-existing extraneous packages (sharp WASM support, emnapi runtime and
tsLib) disappeared from the installed top-level listing during reconciliation;
no source dependency was added for them. Final `npm ls --depth=0` is clean.
Final full npm audit reports **zero vulnerabilities**. This is advisory-database
coverage, not a guarantee against undisclosed issues.

Other updates available at audit time were deliberately not swept in:

| Package/group | Installed before audit | Available within range | Decision |
| --- | --- | --- | --- |
| Photon | 0.3.4 | 0.3.7 | Defer; image-byte pipeline needs separate regression review |
| React / React DOM | 19.3.0 | 19.3.1 | Defer unrelated patch pair |
| React Router / dev | 8.4.0 | 8.5.1 | Defer coordinated router upgrade |
| Vite | 8.3.4 | 8.3.7 | Defer unrelated patch |
| Tailwind / Vite integration | 4.3.3 | 4.3.5 | Defer visual-tooling changes |
| isbot | 5.2.2 | 5.2.3 | Defer unrelated patch |
| Cloudflare plugin / Wrangler | 1.63.1 / 4.149.0 | 1.68.0 / 4.160.0 | Apply smaller matched security fix above |

Separate breaking-upgrade proposals only: TypeScript 5.9.3 -> 7.0.2,
`@types/node` 22.20.5 -> 26.6.6, and Photon 0.3.x -> 0.4.0 (pre-1.0 minor
compatibility boundary). None is implemented or required to resume Phase 6.

## Verification and legacy harness decision

All current acceptance checks passed both before and after the tooling update:

| Check | Result |
| --- | --- |
| `npm.cmd test` | 130/130 pass, no skips |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run build` | Pass |
| `node --experimental-strip-types tests/control-build.mjs` | Pass |
| `node --experimental-strip-types tests/studio-v2-worker.mjs` | Pass |
| `node --experimental-strip-types tests/about-memories-worker.mjs` | Pass |
| `git diff --check` | Pass |

Tests cover mocked OAuth, roles, session revocation, CSRF/origin rejection,
private/live isolation, immutable history, conflicts, media restrictions,
collection management, exact About slots and actual scheduled Worker dispatch.
The About Worker intentionally logs a rejected cross-origin action; its assertions
pass. Temporary fixture checks also returned 200 for `/`, `/community`, `/gallery`,
`/about`, `/updates`, `/servers`, `/safety`, `/login` and `/join`. Posts, Media
Library and homepage/gallery/About Memories editors returned 403 anonymously
and 200 with the fixture Moderator session. This is automated HTTP/fixture QA,
not a new browser, real Discord or real authenticated editorial review.

Two legacy standalone scripts reproduce their previously documented failures:

- `publication-worker.mjs`: legacy `content_workflows` stays scheduled because
  the current Worker correctly sweeps V2 `studio_releases`.
- `media-worker.mjs`: expects retired Media Library copy and approval interfaces;
  first assertion fails on `No images in this collection`.

Decision: retain them as explicitly labelled historical pre-V2 harnesses, retired
from current application acceptance. They are not included by `npm test`.
Do not change Cron to publish legacy records or restore approval routes to satisfy
them. Current Worker suites cover V2 scheduling, independent Cron, duplicate
execution, upload/reuse, rights/delivery, CSRF, conflict and role revocation;
legacy service/migration regression tests remain active. A future modernization
should add distinct missing V2 scenarios rather than duplicate the current suite.

No application behaviour defect was identified within this verification scope.
Actual corrections are stale documentation, ambiguous legacy-test purpose and
the development-tooling security dependency chain. Official community SVGs,
TCC artwork, application source, historical migrations and Cloudflare settings
have no diff from the Phase 5B checkpoint.

## Outstanding manual verification

- Real Discord OAuth, cancellation/expiry, redirects, sign-out and member/staff
  boundaries as Moderator, Administrator and Owner at the configured origin.
- Actual licensed media upload/reuse, private replacement, publication/scheduling,
  rights expiry/revocation and restore, using authorized test content.
- Physical iOS/Android, screen-reader use, keyboard/focus/reduced-motion checks
  and real-source crop/attribution quality. Prior browser handoffs remain
  historical evidence; they were not rerun as live authenticated checks here.
- Official invitation/widget availability and realistic mobile Web Vitals.
- Genuine staff messages with exact consent before Staff Voices is populated.

## Proposed Phase 6A: Servers

Inspect `app/routes/servers.tsx` and `publicPages.servers`: these use the existing
shared informational layout, with connection information honestly unavailable.
Keep that layout and the cinematic homepage unchanged. First inventory
owner-approved public facts (supported version/modpack, eligibility and the
actual way to request access). Then prepare concise approved joining guidance
that preserves private Tailscale membership and the server whitelist. Keep all
network addresses, tailnet identifiers, credentials, access tokens and whitelist
records private. If a detail has not been approved, retain the unavailable state.
Do not add public connection buttons, status polling, new infrastructure or a
new queue. Acceptance: approved copy only, no private details in HTML/loaders,
accessible navigation and mobile layout, existing auth unaffected.

## Proposed Phase 6B: Safety and joint readiness

Inspect `app/routes/safety.tsx` and `publicPages.safety`: general safety guidance
exists, while community-specific policies and reporting channels are unpublished.
Collect the actual owner-approved rules and existing reporting/escalation route;
confirm wording and ownership before publication. Explain private access and
account safety only as supported by existing practices. Do not invent moderation
promises, retention/legal policies, response times or reporting contacts; do not
add a reporting form, database or approval workflow. Review Servers and Safety
together for consistent links, accessible headings, keyboard/mobile use and
honest unavailable content. Re-run relevant route/security tests and obtain
manual content/access review before a separately authorized checkpoint.

## Git checkpoint readiness

Changes are unstaged and limited to documentation, legacy-harness comments,
and the Cloudflare security update/lockfile. Review these paths before staging.
Exclude the unrelated `AGENTS.md.backup`, local environment files, `.wrangler/`,
node_modules, generated types/build output, test logs and private screenshots.
No commits, pushes, merges, deployments, remote migrations, Cron activation or
teaser changes were performed. Phase 6 implementation remains future work.
