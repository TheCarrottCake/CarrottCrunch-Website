# Public V3 — Phase 1 foundation

Phase 1 protects the existing V2 working tree and adds an opt-in public design
foundation. It does not implement the cinematic hero, redesign subpages or change
Content Studio, authentication, publishing, media delivery or database schemas.

## Preserved baseline

- Original branch: `feature/public-website-routing`.
- Audited parent: `90697140b7978b7e946c79842a8344066ebbb241`.
- Local checkpoint: `6f81509cd18e447404f1bdf5f6689a174c6dd638`,
  `Checkpoint Content Studio V2 baseline before V3 redesign`.
- V3 branch: `feature/cinematic-redesign-v3`, created from that checkpoint.

The checkpoint captures 96 existing V2 source, documentation, test and migration
files, including work that had been untracked. All staged paths and source hashes
were checked, the staged whitespace check passed, and a redacted credential scan
reported no findings. The pre-existing migration files were committed as source;
no migration was applied during this phase.

A separate, hash-verified source copy and manifest are preserved in the ignored
`website/.wrangler/checkpoints/v3-phase1-baseline-20261027/` directory. The
pre-existing `AGENTS.md.backup` was copied there and left untouched in its original
location; it is not in the commit. Environment files, credentials, runtime data,
database backups, dependencies, generated types and build output were excluded.
Neither branch was pushed, merged or deployed.

## Scope and integration

`app/routes/public-layout.tsx` imports `app/public-v3.css` and wraps its existing
contents in `.public-v3`. Its loader, headers, revalidation, account forwarding,
navigation, skip link, main landmark, focus restoration and footer are unchanged.

The stylesheet is a public-route asset rather than a new root-level stylesheet.
Every selector requires `.public-v3`. The boundary itself declares only new
`--v3-*` custom properties; existing elements do not opt into the new styles.
Presentation rules require explicit `.v3-*` classes. Existing global styles and
semantic colour tokens remain intact.

Public-layout routes, including the member account page, have the scope.
Standalone Join/Sign In pages and Crunch Control do not. They retain their
existing presentation and behaviour.

## Available foundation

| Area | Tokens / opt-in classes |
|---|---|
| Typography | Existing body/display font aliases; `.v3-display`, `.v3-title`, `.v3-prose` |
| Layout | Content/reading widths, gutters and spacing; `.v3-container`, `.v3-section`, `.v3-stack`, `.v3-cluster` |
| Editorial surfaces | `.v3-editorial`, `.v3-surface` |
| Image presentation | `.v3-media-frame`, `.v3-media-fill` with centred cover sizing |
| Overlay treatment | Existing dark-brown gradient and cream fade tokens; `.v3-image-shade`, `.v3-page-fade` |
| Nature details | Existing decorative/readable sage variants through `.v3-foliage-icon`, `.v3-foliage-label` |
| Controls | 44px minimum target token; `.v3-hero-controls`, `.v3-hero-control` with focus/disabled states |
| Main actions | `.v3-primary-action` uses `--accent` directly, preserving burnt orange independently of decorative aliases |

The desktop hero-size token is 650px at the default root font size. It is only a
token: the existing homepage hero and slideshow have not changed. Mobile sizing
tokens become content-driven. Responsive token adjustments follow the existing
1100px, 760px and 400px boundaries.

Motion tokens reserve transition, crossfade and zoom values for later components.
Reduced motion sets their durations to zero and the zoom factor to one. No new
animation, keyframe, timer or carousel behaviour is introduced in Phase 1.

The existing official SVG, Inter body typography, display-font stack, Apricot Glow
and Leaf Sage values are reused. No font, package or dependency was added.

## Verification

Run from `website/`:

```powershell
node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types tests/control-build.mjs
node --experimental-strip-types tests/studio-v2-worker.mjs
git diff --check
```

Phase 1 results:

- 108 automated tests passed, including the new CSS-boundary and public-layout
  navigation/focus regressions.
- Typecheck and production build passed.
- Built-route authorization/OAuth/CSRF checks and isolated workerd/Cron checks
  passed. They used disposable fixtures, not persistent D1/R2 data.
- A browser fixture compared the current public shell with the checkpoint at
  1440/390/320px. Layout/style samples matched; sticky navigation, mobile menu
  Escape/focus and route focus passed. Crunch Control had no public scope or V3
  tokens and retained its dark sidebar.
- Generated router/Worker types and build artifacts remained in their existing
  ignored locations. The build emits a separate public-layout CSS asset.
- Diff checks passed. Foundation changes remain uncommitted for review.

Browser fixtures use local illustrative content and a mock account. A real OAuth
session and screen-reader review remain appropriate during the later interactive
hero/viewer phase.

## Recommended Phase 2

After approval, build the full-width cinematic hero using the existing published
homepage collection, preserving the homepage copy and CTA destinations. Add
scoped image layers, static left-aligned headline/actions, gentle crossfade/zoom,
pause/reduced-motion behaviour and an accessible uncropped-image viewer.

Keep public image delivery guarded and originals private. The existing 1280px
public derivative may need a separate quality review for a full-width/retina
hero; do not add arbitrary transformations or weaken cache/security policy.
Test overlay contrast against actual published images. Subpage editorial banners
and any new per-page image assignments belong to later approved work.
