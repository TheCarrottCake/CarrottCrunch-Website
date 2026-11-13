# Shared dialog usability refinement

November 12, 2026 (America/Toronto). Local, uncommitted work on
`feature/cinematic-redesign-v3`, preserving the prior V3 rollout, Phase 7A/7B,
About Memories and historical-photo changes.

## Implemented

`StudioItemDialog` now has a stationary labelled header, compact 44px close
control, one scrolling content region and a stationary action footer. Cancel
uses the same unsaved-change guard as Close and Escape; each editor supplies
its own save/removal actions without duplicate Cancel/Save controls. The shell
is used by global Media Library metadata, Homepage/Gallery entries, About
Memories photos and post/event covers. Item-specific fields remain intact.

Mobile dialogs use nearly all available width and height. The content region
fills remaining height, image previews have a height cap, fields wrap, and the
footer reserves bottom safe-area space. VisualViewport resize/scroll listeners
constrain and position the shell within the visible viewport when browser chrome
or the keyboard changes it. Desktop width remains capped at 42rem. No motion
or dependencies were added.

Media Library keeps preview, title and default alt text visible. Existing fields
are grouped under native, keyboard-accessible Details & Credits, Rights &
Restrictions, and Internal & Usage Information disclosures. Fields remain mounted,
so entered values and expansion state survive rerenders and failed saves during
the current editing session. Expansion resets when opening another session.
Server field errors and native invalid events open the relevant disclosure,
mark the field, focus it and announce the failure. Collapsed headings retain
error indicators. Rights blocking/expiry warnings and save/usage failures are
outside the disclosures; rights headings also indicate warnings. Expiry display
uses Toronto calendar dates; authoritative rights validation remains server-side.
No new metadata fields or licensing model were invented.

Nested picker cancel/keyboard events are scoped to their own dialog. Escape
closes the picker while retaining its parent editor. A new automated regression
protects that behavior and the parent's unsaved confirmation. Focus trapping
includes disclosure summaries; focus restoration, background scroll lock,
pending-operation dismissal locks and unload protection remain intact.

## Verification

- 173 full regressions pass, including the new nested-dialog regression and
  existing Content Studio/Media Library UI checks.
- Typecheck and production build pass.
- Current built-route/auth checks and Content Studio V2 Worker/Cron, About
  Memories Worker, Staff Management Worker and Staff Profiles Worker pass.
  Intentional cross-origin rejection diagnostics in Worker logs are expected.
- Actual authenticated Edge review uses the existing localhost header gate,
  synthetic staff session and disposable D1/R2. All four requested editors
  were checked at 1440, 1024, 760, 390 and 320px. Header/footer stay visible
  while the content scrolls; no horizontal overflow was found.
- Browser checks cover disclosure keyboard toggling/value retention, hidden
  source validation and failed-save preservation, native invalid-field reveal,
  long unbroken save-error wrapping, collapsed rights warnings,
  bidirectional focus wrapping, rejected/accepted dirty Escape and focus
  restoration. A reduced 390 x 430 viewport checks keyboard-sized resizing.
- Additional browser checks exercise nested picker Escape, collection-item
  Save staying in working state, and cover selection/Save at 1440/390/320px.
  Global metadata Save/credit hydration and recoverable trash/restore were
  exercised only in the disposable fixture.
- `git diff --check` passes. Logs, browser scripts, results and screenshots stay
  private/ignored under `.wrangler/dialog-refinement-review/`. Wrangler logs,
  registries and XDG config were redirected there for sandbox-compatible checks.

## Review screenshots

| View | Before | After | After scrolling |
| --- | --- | --- | --- |
| Metadata desktop | [Before](../.wrangler/dialog-refinement-review/before-metadata-1440.png) | [After](../.wrangler/dialog-refinement-review/metadata-1440.png) | [Scrolled](../.wrangler/dialog-refinement-review/metadata-scrolled-1440.png) |
| Metadata mobile | [Before](../.wrangler/dialog-refinement-review/before-metadata-390.png) | [After](../.wrangler/dialog-refinement-review/metadata-390.png) | [Scrolled](../.wrangler/dialog-refinement-review/metadata-scrolled-390.png) |

Scrolled shared editors: [Homepage desktop](../.wrangler/dialog-refinement-review/homepage-scrolled-1440.png),
[Homepage mobile](../.wrangler/dialog-refinement-review/homepage-scrolled-390.png),
[Gallery desktop](../.wrangler/dialog-refinement-review/gallery-scrolled-1440.png),
[Gallery mobile](../.wrangler/dialog-refinement-review/gallery-scrolled-390.png),
[Memories desktop](../.wrangler/dialog-refinement-review/about-memories-scrolled-1440.png),
[Memories mobile](../.wrangler/dialog-refinement-review/about-memories-scrolled-390.png).
[Reduced viewport](../.wrangler/dialog-refinement-review/keyboard-sized-390.png).
Equivalent scrolled screenshots exist for every requested width.

## Safeguards and remaining manual checks

No publishing, scheduling, authentication, permission, revision, audit, media
reference or rights-enforcement services were changed. Global metadata Save
remains distinct from collection-item Save and does not publish collections.
Read-only persistent D1 ledger inspection confirmed migrations end at 0013.
No migration was applied, including proposed 0014; no persistent D1/R2 records,
production resources or live teaser were modified. Nothing was staged, committed,
pushed, merged or deployed.

Physical iOS/Android keyboards, mobile browser navigation/safe-area behavior,
screen readers, real Discord sessions and owner usability review remain manual
checks. Desktop emulation verifies viewport resizing, not a physical OS keyboard.
The final coordinated public-site design pass remains deferred.
