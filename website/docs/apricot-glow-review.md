# Apricot Glow palette review

The original Inkscape logo has now been supplied and adopted. The earlier placeholder-logo statements below are historical; see [the authoritative icon review](brand-icon.md) for the current asset and verification.

## Crunch Control extension — October 18, 2026

This update supersedes the dark staff-workspace treatment described in the original review below. The explicit request to extend Apricot Glow supersedes the older AGENTS.md direction to preserve that dark workspace.

- Changes are confined to `app/palette.css` and this review note. Existing working-tree changes were preserved.
- Removed the staff charcoal token override. Dashboard, Media Library, Announcement Editor, and staff access/error shells now inherit the shared apricot background, cream surfaces, dark text, and burnt-orange actions.
- Sidebar uses the existing featured brown and light-text tokens, supporting-orange details and focus rings, burnt-orange active navigation, and distinct hover states. No duplicate literal colors were added.
- Notices and editor feedback use cream surfaces; validation borders retain their error token after native-field rules. Disabled buttons retain readable text. Media tabs, form controls, wrapping buttons/headings, and narrow search fields use shared tokens and responsive sizing.
- No functionality, permissions, authentication, database operations, routing, or content management logic was changed. No commit, push, merge, or deployment was performed.

Validation: all 47 tests passed; typecheck and production build passed. Contrast calculations: primary text/apricot 12.35:1, muted text/cream 6.77:1, accent/apricot 4.67:1, accent/cream 5.25:1, light action text/accent 5.14:1, light text/brown 12.53:1, supporting orange/brown 6.61:1, field border/cream 4.03:1. Supporting orange remains confined to dark sidebar details. Existing responsive breakpoints and reduced-motion rules were preserved; navigation tests cover mobile toggle, Escape, and keyboard behavior.

Visual limitation: local static component fixtures were generated for the dashboard, editor, and Media Library, but headless Edge did not expose its debugging connection. No new screenshots or rendered overflow measurements were obtained for this extension. Browser review at desktop and mobile widths remains outstanding; the older screenshots described below do not validate this update. No live authenticated session was used.

Implemented locally on October 18, 2026, before Milestone 05B. Existing Milestone 05A working-tree changes were retained. No authentication, database, Media Library, or Announcement Editor behavior was changed.

## Theme implementation

- `app/palette.css` defines the approved eight colors and semantic action, border, focus, and error tokens. `app.css` and `personality.css` consume variables instead of literal colors.
- Public pages, navigation (anonymous and signed-in), footer, login, account, articles, cards, links, buttons, notices, native fields, hover states, and focus indicators use the light palette.
- Image overlays and the Minecraft featured panel use dark brown with cream copy and supporting orange details. Supporting orange is not used for small text on light surfaces.
- `html:has(#control-main)` selects the existing staff landmark and scopes the entire Crunch Control viewport to charcoal. This covers dashboard/tool pages and staff access errors without changing routing or authentication. New staff shells must retain that landmark.
- The bitten-C favicon uses apricot and the primary accent. Both favicon and inline bitten-C remain temporary brand marks, pending a supplied final asset.
- Root `AGENTS.md` palette guidance was updated; its other rules were preserved.

## Validation and visual review

- `npm run test`: 47 passed, 0 failed.
- `npm run typecheck`: passed.
- `npm run build`: passed, including a final rebuild after visual refinements.
- `git diff --check`: passed.
- On Windows, commands were invoked with `npm.cmd` because PowerShell blocks `npm.ps1`. Tests and local preview were rerun successfully with process-local `XDG_CONFIG_HOME` and `WRANGLER_LOG_PATH` pointing into ignored `.wrangler/` directories. No project configuration was changed.

Headless Edge review used 1440px desktop and 390px mobile viewports. Reviewed the homepage, public content pages, updates, Discord login, join page, account unavailable state, and staff access unavailable state. Account, article body, and staff dashboard presentations were also rendered from the existing React components with explicitly fictional fixture data. Both expanded and closed signed-in navigation were inspected. No live sign-in was performed and no fixture data was persisted to the application database.

The reviewed screens retain their existing responsive layout. Public cards and mobile menus are cream on apricot, text and links remain readable, featured image copy stays cream on brown shading, and staff cards remain dark. No horizontal overflow was detected in the sampled viewports. Focus outlines were inspected on both light and dark screens; existing navigation/keyboard tests also passed. Reduced-motion rules remain intact.

Measured WCAG contrast ratios (solid palette pairs):

| Pair | Ratio |
| --- | ---: |
| Primary text / apricot | 12.35:1 |
| Muted text / apricot | 6.03:1 |
| Muted text / cream surface | 6.77:1 |
| Primary accent / apricot | 4.67:1 |
| Primary accent / cream surface | 5.25:1 |
| Cream action text / primary accent | 5.14:1 |
| Cream text / dark brown | 12.53:1 |
| Supporting orange / dark brown | 6.61:1 |
| Strong field border / cream surface | 4.03:1 |

Screenshots and review fixtures are local, ignored artifacts in `website/.wrangler/palette-review/`, including `home-1440.png`, `home-390.png`, `community-1440.png`, `login-390.png`, and `fixture-*-*.png`. Fixtures are presentation checks, not evidence of authenticated browser sessions.

## Remaining visual limitations and literal colors

- The external Discord widget was blank in this browser session. Its embedded content is owned by Discord and cannot inherit the site's CSS; the surrounding frame uses dark brown. Verify it in a normal browser with Discord access.
- Local login was unavailable and content storage was unconfigured, so live authenticated pages and a published article could not be reviewed end to end. Their component fixtures and existing automated behavior tests were reviewed instead.
- All literal application CSS colors are centralized in `app/palette.css`: approved colors, derived hover/border colors, and intentional staff charcoal values.
- `public/favicon.svg` necessarily contains its two approved literal colors. Illustration colors remain in `public/images/overworld.svg`, `after-hours-placeholder.svg`, and `create-workshop-placeholder.svg`; these are intentional artwork, not interface theme colors.
- Unused starter artwork in `app/welcome/logo-dark.svg` and `logo-light.svg` retains its original literals. No public route uses these starter logos.

No deployment, commit, merge, or push was performed.
