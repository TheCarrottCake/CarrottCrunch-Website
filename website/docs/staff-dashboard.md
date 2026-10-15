# Staff entry and dashboard (Task 03B)

Implemented on the existing clean `feature/public-website-routing` branch. Authentication, OAuth callbacks, session validation, role checks, CSRF logout, Discord joining, D1 queries, and publication rules are preserved.

## Public navigation

The shared header now includes a secondary **Staff Sign In** button linking to `/control`. The existing authentication routes decide whether the visitor may enter, must sign in, or encounters unavailable configuration. The Discord action remains `/join`, is labelled **Join Discord**, and has primary orange styling. Both actions are present in desktop and expanded mobile navigation. The header switches to its menu at tablet/small-desktop widths to avoid overflowing the added action.

Public loaders do not already expose staff authentication state. The public header therefore keeps the Staff Sign In label, including for a signed-in visitor returning to a public page. No cookie inspection, client-side authorization, private staff lookup, or new personalized public loader was introduced solely to change that label. Inside Crunch Control the verified identity and role are available from its protected loader.

## Dashboard

`/control` now renders a branded staff dashboard instead of the minimal welcome page. The existing loader is unchanged and still calls `requireStaff` on the server. It returns only the current member's display name/username, authorized role, and anti-CSRF token.

Desktop has a sidebar, current Overview link, public-site return link, and secure Sign Out form. A constrained scrollable sidebar keeps actions accessible on shorter desktops. At 900px and below, the sidebar becomes an in-flow mobile header with a Tools toggle, `aria-expanded`/`aria-controls`, link-to-close behavior, and Escape-to-close with focus restoration. Main content and cards stack at smaller widths. Skip navigation and visible keyboard focus remain available.

Future tools are noninteractive text with visible **Unavailable** labels, plus descriptive cards marked **UNAVAILABLE · FUTURE TOOL**. There are no management-route URLs, fake publishing buttons, fabricated statistics, activity entries, or operational integrations. Overview is the only implemented dashboard destination.

| Tool | Moderator | Administrator | Owner |
| --- | --- | --- | --- |
| Overview | Visible | Visible | Visible |
| News & Events | Unavailable | Unavailable | Unavailable |
| Gallery | Unavailable | Unavailable | Unavailable |
| Media Library | Unavailable | Unavailable | Unavailable |
| Staff Profiles / approvals | Hidden | Unavailable | Unavailable |
| Homepage Manager | Hidden | Unavailable | Unavailable |
| Activity History / moderation | Unavailable | Unavailable | Unavailable |
| Settings | Hidden | Unavailable | Unavailable |

Owner Settings specifically describes future role assignments and restricted configuration. Administrator Settings describes site settings only. These are module-level presentation rules, not grants for every future operation within those modules. Future implementations must independently authorize each loader/action using existing server helpers and distinguish ordinary moderation history from restricted/security history, profile approval from role assignment, and site settings from restricted configuration.

The secure Sign Out form retains POST, `reloadDocument`, and the existing `_csrf` token. The handler/session code is untouched. Public navigation, unavailable cards, and sidebar visibility cannot bypass server authorization. Unauthorized Discord accounts remain denied by the existing authentication foundation.

The existing temporary bitten-C brand mark remains in use; no new logo or real community content was invented.

## Changed files

- `app/components/community.tsx`: shared Staff Sign In link, Discord action styling/label, existing mobile close behavior reused.
- `app/components/control-dashboard.tsx`: typed responsive dashboard, navigation, identity/role, unavailable tools, public return, secure sign-out form.
- `app/lib/dashboard-tools.ts`: presentation-only typed role/tool catalogue.
- `app/routes/control.tsx`: replaces only the rendered welcome component; protected loader/error handling retained.
- `app/app.css`: scoped dashboard/header styling and responsive breakpoints.
- `tests/dashboard.test.mjs`: role visibility and Owner-only configuration description.
- `tests/navigation.test.mjs`: component event harness using existing TypeScript/React tooling for public and staff navigation, menu controls, Escape/focus restoration, disabled future tools, and CSRF form structure.
- `README.md`, this document: behavior, validation, and remaining manual checks.

No dependency, migration, authentication credential, D1 binding, public content loader, or production infrastructure change was needed.

## Validation and limitations

Run from `website/`:

```sh
npm run test
npm run typecheck
npm run build
node --experimental-strip-types tests/control-build.mjs
```

The regression suite verifies unauthorized accounts, session expiry/revocation, role boundaries, OAuth state/PKCE/callback failures, and logout. Post-build checks invoke the real protected loader/action with isolated D1 and mocked Discord, verify anonymous denial, minimal authenticated welcome data, logout invalidation, and absence of auth server code/secrets from client bundles.

Navigation interaction tests exercise both shared desktop/mobile markup and the collapsed/expanded menu state, click-to-close, Escape, restored focus, role-specific tool visibility, and non-clickable future destinations. This environment has no browser runtime: these tests do not verify actual viewport rendering, browser tab order, screen-reader announcements, or computed CSS. No browser/dependency was installed.

Manual browser checks remain: public header at wide/tablet/mobile widths, sidebar at tall/short desktop heights, mobile Tools toggle, keyboard Tab/Escape/skip link, role-specific dashboard presentation, actual Discord sign-in for an approved account, denied account, secure sign-out/Back/reload, and existing homepage carousel/News & Events/join flow. Live Discord verification still requires the ignored configuration documented in [staff authentication](staff-authentication.md).

No deployment, remote resource creation, domain/DNS change, push, merge, or Content Studio editing was performed.

### Recorded Task 03B results

All **23 tests** passed, including header/dashboard interaction checks, role visibility, unauthorized Discord accounts, session and logout security, News & Events, and invitation validation. `npm run typecheck`, `npm run build`, `node --experimental-strip-types tests/control-build.mjs`, and `git diff --check` passed. The protected loader and logout handler were preserved. Browser viewport/rendering and live Discord checks remain manual; no browser runtime is installed in this workspace.

## Task 03C navigation update

The public header now uses unified Sign In and a server-verified account disclosure. Ordinary members can sign in but cannot enter Crunch Control; authorized staff use the same flow. Dashboard tools/roles are unchanged. See [Unified Discord authentication](unified-authentication.md). The earlier Staff Sign In label notes are historical.
