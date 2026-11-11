# Public V3 Phase 6B: Community Safety

## Current layout refinement - November 11, 2026

The approved policy meaning is preserved in a three-part editorial composition:

1. **The Ground Rules:** four connected rows for Respect & Behaviour, Play Fair,
   Keep Chats Enjoyable, and Privacy & Account Safety. Ordinary swearing,
   mature humour and friendly banter remain permitted; all harassment,
   discrimination, sexual-content, exploit and privacy distinctions remain.
2. **Minecraft Server Expectations:** the four existing Create expectations and
   `/servers/create` link, compactly separated from general rules.
3. **Reporting & Staff Accountability:** a cocoa reporting focal point with
   distinct Moderator / Administrator-or-Owner instructions and `/join`, followed
   by readable staff-discretion and accountability columns (stacked on mobile).
   All eight accountability paragraphs remain, including review/corrective steps
   and improving procedures. Immediate-danger guidance remains discreetly below.

The hero has one introduction and one age notice. Navigation has three targets.
No repeated age rule or separate account-safety panel. Credential guidance is
shown once under Privacy & Account Safety. The reporting reminder to avoid
sensitive personal information moves there; its repeated password/token warning
is covered by the stronger existing prohibition on sharing/requesting credentials.
No policy is weakened or new moderation workflow introduced. The typed approved
policy catalog is unchanged. New labels organize copy without adding penalties,
appeal guarantees, response times or staff contacts.

A consistent 70rem maximum width, aligned editorial columns, compact dividers,
and one purposeful cocoa transition replace the scattered sections/cards.
Existing semantic Apricot Glow, Leaf Sage and cocoa tokens remain. No other page,
shared stylesheet, authentication, Content Studio, permission, dependency,
configuration, database or server functionality changes.

Changed for this refinement:

```text
website/app/routes/safety.tsx
website/app/safety.css
website/tests/safety.test.mjs
website/docs/public-v3-phase6b.md
website/docs/project-status.md
```

Validation: 147 regression tests passed, typecheck/build passed, and existing
control-build, studio-v2-worker and about-memories-worker checks passed with
disposable bindings, including Cron. Safety tests retain all approved paragraph
assertions except the deliberately consolidated reporting credential reminder;
they additionally enforce single age/credential occurrences and three labelled
sections. The existing source catalog and unrelated source files are unchanged.

Actual Vite/Edge review used `http://localhost:5173/safety` at 1440, 1024, 760,
390 and 320px. All widths pass headings/anchor labels, keyboard anchor activation,
visible focus, mobile menu keyboard operation, contrast (tested policy/link/
label text >=4.5:1), reduced motion and horizontal-overflow checks. Both page and
stylesheet also return HTTP 200 through 127.0.0.1 and ::1 without import errors.
Same-session Homepage Section 03, Games, Servers/Create, Gallery, About and Login
smoke checks pass. The Vite log has no unresolved stylesheet-import errors.

Current screenshots (ignored local review evidence):

- [1440px](../.wrangler/phase6b-review/safety-layout-1440.png)
- [1024px](../.wrangler/phase6b-review/safety-layout-1024.png)
- [760px](../.wrangler/phase6b-review/safety-layout-760.png)
- [390px](../.wrangler/phase6b-review/safety-layout-390.png)
- [320px](../.wrangler/phase6b-review/safety-layout-320.png)

Browser assertions: `.wrangler/phase6b-review/layout-review.mjs` and
`layout-results.json`. No production changes, staging or commits. Owner visual
approval, physical-device and screen-reader checks remain manual; automated
browser review blocks external Discord/font requests and does not verify real
Discord sign-ins or staff handling. Existing records below describe the initial
implementation, not the current composition.

## Initial implementation record - November 10, 2026

Implemented November 10, 2026, in `C:\Projects\CarrottCrunch-Website`, branch
`feature/cinematic-redesign-v3`, based on `898cd5a`. Owner-approved policy is
implemented; visual approval of this new page remains pending. All work stays
uncommitted and unstaged. No push, merge, deployment, production resource change,
remote migration, teaser change or new dependency.

## Scope and design

The `/safety` route now has the approved headline **Good games. Good neighbours.**
A two-column desktop introduction pairs expressive typography with an original
18+ note and restrained geometric foliage. Five wrapping anchor links lead to
community rules, Minecraft expectations, reporting, staff accountability and
account safety. Rules use editorial rows; adult-humour boundaries receive a
wider sage-edged surface. A cocoa reporting feature provides the official
`/join` link. Minecraft has a separate `/servers/create` link. Narrow screens
stack content; decorative shapes are clipped inside their own surface.

All new styles are scoped to `.public-v3 .v3-safety*`, use existing semantic
Apricot Glow/Leaf Sage tokens and add no third-party artwork or animation.
Visible focus and reduced motion are supported. One H1, five H2s and seven H3s
provide a clear hierarchy; section labels and anchor targets are connected.
The existing public shell, official branding, Homepage, Games, Servers, Gallery,
About, authentication and Content Studio remain in place. The old shared Safety
summary no longer claims that policies/reporting guidance are unavailable.

## Files added or changed in Phase 6B

```text
website/app/content/safety.ts
website/app/content/public-pages.ts
website/app/routes/safety.tsx
website/app/safety.css
website/tests/safety.test.mjs
website/docs/public-v3-phase6b.md
website/docs/project-status.md
website/docs/phase6b-safety-proposal.md
website/docs/phase6-final-checkpoint.md
```

The last two documents receive historical/superseded notices only. Their original
proposal/checkpoint records remain intact. These nine paths are additional to
the earlier Phase 6A/6A.1 review list; no automatic staging occurred. Private
state, screenshots, browser profiles, backups, `AGENTS.md.backup` and the unused
SVG concepts remain outside any proposed source checkpoint.

## Policy and private-data boundaries

The typed public catalog contains only approved policy text. Community rules,
Minecraft bullets, reporting and accountability paragraphs were checked against
the owner's supplied request verbatim. General reporting goes to a Moderator
privately through Discord; staff concerns go to an Administrator or the Owner.
There are no named contacts, guaranteed confidentiality/response times, penalty
ladder, mandatory strike system, appeal deadline or invented independent
Owner-review process. The approved discretionary action, review and corrective
steps wording is preserved below.

No loader/action, API, form, queue, database table, migration, bot integration,
moderation permission or publication approval is introduced. Public content has
no private staff identities, reports, evidence, whitelist entries, network
addresses or credentials. Existing auth/authorization and private-media
boundaries are unchanged. The persistent ledger was queried read-only and still
ends at `0013_about_memories.sql` (2026-10-28 02:58:01 UTC).

## Verification

- Full regression: **147 passed**, zero failures/skips, including three Safety
  policy, navigation/semantics and static-boundary tests.
- `npm.cmd run typecheck` and `npm.cmd run build`: passed.
- `node --experimental-strip-types tests/control-build.mjs`: passed.
- `node --experimental-strip-types tests/studio-v2-worker.mjs`: passed.
- `node --experimental-strip-types tests/about-memories-worker.mjs`: passed.
  Current Worker checks exercised actual local Cron with disposable bindings;
  deliberate rejected-origin errors are expected test output.
- Browser review at **1440, 1024, 760, 390 and 320px**: no horizontal overflow,
  correct headings/anchor labels, keyboard anchor activation and visible focus,
  anchor destinations below the header, mobile menu Enter/Escape and focus
  return. Policy text/link/label samples meet contrast of at least 4.5:1.
  Reduced-motion transition suppression passes; the page adds no animation.
- Same-build browser smoke checks: Homepage Section 03 ordering, six Games
  entries, Servers/Create, Gallery, About and Login render without overflow.
- Existing suites cover Content Studio, role authorization, CSRF, private/public
  isolation, scheduling and immutable history using fake sessions/synthetic data.
- `git diff --check`: passed. No new migration or dependency/config change.

Browser review uses an isolated built Worker fixture, not persistent community
content. External Discord/font requests are blocked in the automated browser;
actual Discord role sign-ins, destination availability, physical devices and
screen-reader testing remain manual. Source policy content has no unresolved
wording decisions; owner visual review is still required. This public page does
not create or certify a private moderation workflow.

## Screenshots and local evidence

All screenshots were captured from the same build and visually inspected.
They are ignored local review artifacts, not source assets:

- [1440px Safety](../.wrangler/phase6b-review/safety-1440.png)
- [1024px Safety](../.wrangler/phase6b-review/safety-1024.png)
- [760px Safety](../.wrangler/phase6b-review/safety-760.png)
- [390px Safety](../.wrangler/phase6b-review/safety-390.png)
- [320px Safety](../.wrangler/phase6b-review/safety-320.png)

Browser script and measured results: `website/.wrangler/phase6b-review/review.mjs`
and `results.json`. Test/build logs are in the operating-system temp directory
with the `phase6b-` prefix.

## Approved policy reference (original wording)

CarrottCrunch is a place to hang out, make friends, play games, and have a good time. We're pretty laid-back, but a little common sense helps keep things enjoyable for everyone.

### Community rules

#### 18+ Community

CarrottCrunch is an 18+ community. Membership is intended for adults only.

#### Respect Everyone

Treat other members with respect.

Friendly banter, playful teasing and joking around are welcome, but bullying, harassment, threats and deliberately making someone uncomfortable aren't.

If someone asks you to stop, respect their boundaries.

#### Swearing & Adult Humour

Swearing, mature jokes, innuendos and playful trash talk are permitted.

We're here to have fun, not police every word someone says.

However, racism, hate speech, discriminatory slurs and targeted harassment are not tolerated, even when disguised as jokes.

Unwanted sexual comments or advances toward other members are not acceptable.

Explicit sexual content and pornography do not belong in general community channels.

#### Exploits & Cheating

Do not share, promote or encourage game-breaking exploits, cheating methods, duplication glitches or instructions for abusing bugs in public community channels.

If you discover a serious exploit affecting a CarrottCrunch server, report it privately to staff instead.

#### Don't Ruin the Fun

Do not grief, deliberately sabotage other players or intentionally ruin their experience.

Respect shared spaces and other players' progress.

#### Privacy & Account Safety

Respect other members' privacy.

Do not publicly disclose personal information, private conversations or private messages without appropriate permission.

Relevant evidence may be shared privately with authorized staff when reporting concerns.

Never share or request passwords, authentication tokens or sensitive account credentials.

#### Keep the Community Enjoyable

Avoid spam, scams, malicious links, excessive unwanted pings and deliberate disruption of conversations or voice chats.

### Minecraft server expectations

- Respect other players and their builds.
- No griefing or deliberate sabotage.
- Avoid lag-heavy builds and machinery.
- Be considerate when building near other players or using shared spaces.

### Reporting concerns

For general community concerns, contact a CarrottCrunch Moderator privately through Discord.

If your concern involves a staff member, contact an Administrator or the Owner instead.

Share what happened and any relevant information or screenshots you have. There's no need to confront someone or discuss the situation publicly.

Please avoid sharing sensitive personal information, passwords or account tokens.

### Staff moderation & accountability

Rule violations are handled at the discretion of CarrottCrunch staff.

We trust our Moderators and Administrators to use good judgment, consider the circumstances, and take whatever action is reasonably necessary to keep the community safe, respectful, and enjoyable.

Not every situation is the same, and moderation decisions will reflect that. Serious violations may require immediate action without a prior warning.

Our staff are accountable, too.

If a moderation action appears unjustified, unfair, or an abuse of authority, concerns can be raised directly with an Administrator or the Owner.

These concerns will be reviewed, and where an action is found to have been taken without reasonable justification, appropriate corrective steps will be considered.

If an issue reveals weaknesses in how moderation is handled, we'll work to improve our procedures to help prevent similar situations in the future.

Our goal isn't to punish people unnecessarily. It's to protect the community and keep things fair for everyone.

### Account safety

Never share or request passwords, authentication tokens or sensitive account credentials.

Use the Join Discord link on this website to reach the configured official invitation. Be cautious with unsolicited links and requests for passwords or account tokens.

For immediate danger, contact your local emergency services.

## Follow-up: local Vite stylesheet error investigation

The reported `Failed to load url ../safety.css` error was investigated in the
same V3 checkout. `app/safety.css` exists (6,841 bytes), and resolving
`../safety.css` from `app/routes/safety.tsx` correctly reaches that file.
No relative application imports were missing (generated route types excluded).
No source, import-path or approved-design change was necessary.

A fresh `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort` session
served `/safety`, `/app/safety.css` and the transformed Safety route module with
HTTP 200. Homepage, Games, Servers/Create, About, Gallery and Login also returned
200. Edge reviewed the actual Vite app at all five target widths; section
navigation, keyboard focus, contrast, reduced motion and overflow checks passed.
The original error could not be reproduced; a stale or transient development
session is a possible cause, not a verified source-code defect. Starting a fresh
Vite session restored verified local operation without deleting caches or state.

All 147 regression tests, typecheck and build passed again. Live-dev screenshots
are `website/.wrangler/phase6b-review/safety-dev-{width}.png`; browser assertions
are in `dev-results.json` beside them. No commits, pushes or production changes.
