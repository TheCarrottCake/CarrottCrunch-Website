# Public V3 Phase 5A handoff

Implemented locally on `feature/cinematic-redesign-v3`. Changes remain
uncommitted. A source-only checkpoint and artwork hashes are retained under
ignored `.wrangler/checkpoints/v3-phase5a-before/`. `AGENTS.md.backup` is untouched.

## Gallery

The unchanged gallery loader still reads the existing published V2 collection
and its release-bound media. `PublicGallery` supplies the public presentation;
the existing Studio collection editor and shared editor preview are unchanged.

- Enabled items retain featured-first ordering. Featured entries span both grid
  columns on desktop, with a larger full-width image and a visible label.
- Regular tiles use centred `cover` at 3:2. Featured desktop frames use a capped
  wide crop; mobile featured frames use 4:3. Portraits are cropped without
  stretching. No original or derivative bytes are changed.
- Creator and mandatory credits remain outside the image, with safe source links.
- Every available image has an accessible, individually named full-image action.
  The existing `FullImageDialog` adds an optional gallery trigger style/label;
  its default hero presentation and callback behaviour remain intact.
- The dialog shows the same guarded detail derivative with `contain`, combined
  credits, loading/error feedback, native modal semantics, Tab containment,
  Escape and focus restoration.
- No collection and published collections without enabled entries show an honest
  empty state. Missing/restricted images retain entry text with an unavailable
  panel; network failures offer a manual retry. Private preview URLs are rejected.

## Staff Voices

`StaffVoices` is inserted immediately after the founder message. It renders
nothing when there are no public contributions. **The curated source is empty:
no real staff messages or identities were supplied.** The approved About copy,
scrapbook placeholders, founder message and TCC artwork remain intact.

`app/content/staff-voices.server.ts` is the only curated source. Its loader
projection explicitly selects public fields before serialization. No Discord
profile joins, IDs, evidence or arbitrary extra properties are exposed.

For a future genuinely supplied contribution:

1. Obtain consent for the exact message and chosen attribution. Keep supporting
   evidence private and outside the public source/payload. Consent flags record
   a curator's attestation; they do not generate or replace real consent.
2. Add the exact message, explicitly chosen display name and only separately
   consented role/portrait fields. Do not populate anything from private Discord
   account details. Unconsented messages/names are omitted.
3. Anonymous entries publish only the message and “Staff member.” Name, role,
   portrait, image alt/credits and other identifying properties are omitted.
   Review the message itself for self-identification with the contributor;
   software cannot guarantee anonymity from the prose alone.
4. Optional portraits must already have an authorized current public detail
   derivative. Copy the appropriate required licence credit/source and meaningful
   alt text. Do not use private previews or Discord avatar URLs. Portraits use
   `cover`; failed images disappear while the message remains.
5. Review and release the curated code through the existing code-review process.
   Corrections/withdrawals need a source update and release in Phase 5A. There is
   no new staff-submission endpoint, database table or publication approval queue.

A portrait currently depends on its existing authorized V2 release. Unpublishing
or replacing that release can make the portrait unavailable. This implementation
does not create independent media references for staff voices; managed About
media and independently published portraits belong to Phase 5B. Do not remove
mandatory image attribution to make a contribution anonymous: omit that portrait.

## Preservation and scope

- Homepage route and hero source hashes are unchanged; `cover`, existing mobile
  positioning, zoom, crossfade, controls and reduced-motion behaviour remain.
- All pre-existing CSS is preserved; new gallery/staff styles are public-scoped
  opt-ins. No letterboxing was introduced into normal gallery tiles.
- All five community/TCC SVG hashes match the starting checkpoint.
- Gallery loader, headers, metadata and publishing services are unchanged.
- No dependencies, migrations, data resets, persistent D1/R2 changes, About Media
  management, new gallery manager, commits, pushes, merges or deployments.

Files added:

- `app/components/public-gallery.tsx`
- `app/components/staff-voices.tsx`
- `app/content/staff-voices.server.ts`
- `app/lib/staff-voices.ts`
- This handoff.

Files updated:

- `app/components/full-image-dialog.tsx`
- `app/routes/gallery.tsx`
- `app/routes/about.tsx`
- `app/public-v3.css`
- `tests/public-editorial.test.mjs`

## Validation

- **125/125 full regression tests passed.** Focused tests cover gallery ordering,
  credits, unavailable/private sources, published-empty collections, empty Staff
  Voices, consent flags, anonymous/private-field projection and optional portraits.
- Typecheck, production build, built-route checks and isolated local Worker/Cron
  checks passed. Git diff checks passed.
- Browser checks passed at **1440, 1024, 760, 390 and 320px**: no horizontal
  overflow; full-width featured frames; edge-to-edge cover images; larger featured
  presentation; visible credits; keyboard Enter, modal Source/Tab/Shift+Tab,
  Escape, scroll restoration and trigger focus return.
- Empty, disabled, missing and failed images were exercised. A clearly labelled
  synthetic portrait test image confirmed cropped tiles and uncropped viewing.
- About's real empty source stays hidden. Separate, labelled test-only named and
  anonymous contributions exercised portrait cropping and identity suppression.
  These fixtures are ignored browser-test artifacts, not public staff statements.
- Homepage cover/positioning and desktop 650px height, rotation, reduced motion
  and original viewer focus/Escape passed again.

Browser fixtures use actual components with mocked transport and previously
verified public derivative copies. They do not publish content or test real
Discord credentials. Review screenshots are retained outside Git at
`.wrangler/v3-phase5a-review/gallery-1440.png` and `gallery-390.png`.

## Remaining manual checks

- Physical iOS/Android and NVDA/VoiceOver testing of gallery navigation, long
  attribution, portrait viewing and focus return.
- Real published collections with varied crops and licence sources; real network
  failures and permission expiry/revocation using authorized test assets.
- Contributor-supplied messages and explicit consent before populating the source;
  verify anonymous prose, role labels and portrait licensing individually.
- Real OAuth/member sessions remain a separate release sign-off item. No new
  authentication or publishing behaviour is introduced here.

Phase 5B remains unimplemented. The separate teaser and production resources were
not touched.
