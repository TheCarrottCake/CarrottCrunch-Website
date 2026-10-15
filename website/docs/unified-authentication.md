# Unified Discord authentication (Task 03C)

This milestone extends the existing authentication engine on `feature/public-website-routing`; it does not add a competing OAuth flow. Public content, the Crunch Control dashboard, Discord joining, and News & Events publication rules are preserved. Earlier staff-only authentication/dashboard documents describe the historical milestones; this document supersedes their staff-only sign-in behavior.

## Routes and configuration

- `/login`: one public **Sign In with Discord** screen, for members and staff.
- `/auth/start`: same-origin POST into the existing OAuth authorization-code/identify/S256-PKCE flow.
- `/control/auth/callback`: the **existing registered callback URI**, intentionally retained. No second callback or OAuth credentials are needed.
- `/account`: authenticated basic account page, showing the current user's Discord identity, optional avatar, staff-entry link when authorized, and secure sign-out.
- `/logout`: same-origin CSRF-protected POST that invalidates the current site session and unconsumed OAuth attempt.
- `/control`: existing protected dashboard. Anonymous visitors go to `/login`; signed-in members without staff authorization receive HTTP 403 rather than a login loop.
- `/control/login`: safe compatibility redirect to `/login`.
- `/control/auth/start` and `/control/logout`: compatibility aliases into the same shared implementation.

Successful sign-in redirects authorized staff to `/control` and other members to `/account`. Destinations are server-selected fixed paths; user-supplied redirect parameters remain ignored. Signing in to the website does **not** join the Discord community. `/join` and the prominent Join Discord button remain separate and unchanged in destination.

Existing server-only credentials are reused: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `AUTH_CSRF_SECRET`, optional `INITIAL_OWNER_DISCORD_ID`, and `CONTROL_ORIGIN` (historical binding name, now the canonical site authentication origin). Keep them in ignored `.dev.vars.content_dev` or an authorized secrets system. Never use `VITE_` prefixes or commit/paste real credentials. The Discord Developer Portal callback remains exactly `<CONTROL_ORIGIN>/control/auth/callback`; no portal change is necessary if that origin is unchanged.

Local setup from `website/`:

```sh
npm run db:migrate:local
npm run dev:content
```

See [the authentication configuration guide](staff-authentication.md) for confidential-client credentials, strict origin/redirect matching, private Codespaces forwarding, and HTTPS cookie requirements. Its staff-only restriction is replaced by the account behavior here. Missing credentials/database/schema fail closed for sign-in/account/control, while public pages remain accessible anonymously.

## Migration and account data

`0005_unified_accounts.sql` is additive and retains all existing content migrations, staff accounts/roles, access versions, and the one-time Owner bootstrap marker. It adds:

- `site_users`: immutable Discord user ID primary key, username, display name, optional Discord avatar hash, creation/update timestamps.
- `site_sessions`: SHA-256 hash of a random opaque bearer value, user foreign key, creation/absolute-expiration timestamps, optional revocation timestamp, indexes.

There are no email, guild membership, Minecraft identity, access/refresh token, or advanced-profile fields. Identity is updated from the verified Discord response on later sign-ins without changing the account key. Avatar hashes are validated, and avatar URLs are constructed server-side only for Discord's fixed CDN host. A missing/unavailable avatar uses an initial in the header. No uploads or profile editing endpoints exist.

**Legacy staff sessions and outstanding OAuth attempts are invalidated once by migration 0005. Existing staff must sign in again.** The old session table remains only for schema/history compatibility and is no longer used for authentication. The existing `staff_oauth_transactions` table/name is reused for the one shared OAuth flow. No accounts or staff identities are seeded by the migration.

Only a successfully verified Discord identity creates/updates a `site_users` record. Any valid human Discord user can sign in, including an ordinary member or someone whose staff access was removed. Account creation never inserts a staff assignment except the preserved, separately configured, one-time exact-ID Owner bootstrap. Ordinary registrations do not consume or block that bootstrap: it still checks the staff table/marker, not the member account table.

## Authorization and session security

All users share the same random 256-bit opaque cookie, HttpOnly/SameSite=Lax/HTTPS Secure rules, eight-hour absolute expiry, SHA-256 D1 storage, rotation, state/browser binding, PKCE, provider validation, token disposal/revocation, and CSRF mechanism. Local loopback HTTP is development-only. Tokens and raw session identifiers are never serialized into loader data or logs. Historical function names such as `staffCsrfToken`/`logoutStaff` remain compatibility names for shared session protection; they do not implement a second session system.

`currentSiteSession`, `requireSiteUser`, and `requireSiteAction` serve account access/actions. `currentStaffSession`, `requireStaff`, and `requireStaffAction` resolve the current staff assignment from D1 and enforce Moderator/Administrator/Owner boundaries independently on the server. No Discord guild role, server membership, website registration, display name, avatar, or Minecraft link confers staff authority.

Staff role/active changes delete that user's site sessions and increment the existing access version. Staff deletion also revokes site sessions. Old cookies therefore stop working on the next request. After signing in again, a revoked staff member can use their basic account but cannot enter Crunch Control or perform protected staff actions. Site sessions also support explicit D1 `revoked_at` invalidation. Member account records persist after logout. Owner bootstrap remains consumed after Owner removal and never resurrects revoked roles.

Every future authenticated action must use `requireSiteAction`; every staff action must use `requireStaffAction` with the correct minimum role. Staff management remains Owner-controlled and out of band. There are no role-changing public endpoints. Requests already executing at revocation can finish; future business mutations need transactional authorization/concurrency design.

## Header privacy and accessibility

The shared public layout resolves only the current request's session and passes a minimal view: own username/display name, avatar URL, `canAccessControl` boolean, and anti-CSRF token. Anonymous requests receive `account: null`. No staff record, staff role list, session hash, OAuth credential, or bearer token is returned. The avatar reference can contain the current user's public Discord ID as part of the CDN URL; a separate raw ID is not included in account/header view data.

Personalized public responses are private/uncached (`Cache-Control: private, no-store`, `Vary: Cookie` at the layout; content routes also retain no-store). Layout state revalidates on navigation, so role/expiry changes update the header on the next request. An already-open page is not a live authentication monitor; the server remains authoritative on each navigation/action.

Anonymous visitors see **Sign In**. Authenticated visitors see an avatar/initial and an accessible account disclosure containing My Account and Sign Out; Crunch Control appears only for verified active staff. Desktop uses a popover and mobile uses an in-flow panel. It supports Tab navigation, ArrowDown opening, initial link focus, Escape with focus restoration, outside-pointer/blur closing, and closing on navigation. It uses ordinary disclosure/list semantics, not an incomplete ARIA menu. Logout retains POST, `reloadDocument`, and the session-bound `_csrf` field. Join Discord stays visually prominent and independent.

## Changed files

- `migrations/0005_unified_accounts.sql`: persistent users, site sessions, migration invalidation, and staff-revocation triggers.
- `app/lib/staff-auth.server.ts`: extends the single OAuth engine for member accounts; shared site sessions/CSRF/logout; separate staff role checks; safe avatar presentation.
- `app/lib/account-view.ts`: typed minimal account/header view.
- `app/routes.ts`: public login/auth/account/logout registration, existing routes preserved.
- `app/routes/login.tsx`, `account.tsx`, `auth-start.ts`, `logout.ts`: unified sign-in, protected basic account, thin resource aliases.
- `app/routes/control-login.tsx`, `control.tsx`, `control-logout.ts`: safe compatibility redirect, explicit member 403, shared sign-out message.
- `app/routes/public-layout.tsx`: safe current-user header loader, private caching and revalidation; public content remains anonymous-accessible.
- `app/components/account-menu.tsx`, `account-shell.tsx`, `community.tsx`: accessible account disclosure, public sign-in layout, shared header integration.
- `app/components/control-dashboard.tsx`: My Account navigation from the preserved staff dashboard.
- `app/app.css`: scoped account/avatar/menu styles.
- `tests/staff-auth.test.mjs`, `navigation.test.mjs`, `control-build.mjs`: member/staff authentication, migration preservation, menu behavior, minimal loader responses, account/control boundaries and logout.
- `README.md`, this document and previous authentication/dashboard guides: milestone documentation.

## Validation and remaining limits

From `website/`:

```sh
npm run test
npm run typecheck
npm run build
node --experimental-strip-types tests/control-build.mjs
```

Tests use isolated nonpersistent D1 and mocked Discord. They cover member/Moderator/Administrator/Owner sign-ins, registration without staff grants, minimal persistence and identity updates, migration preservation, expiry/revocation/role changes, site and staff CSRF boundaries, secure logout, OAuth replay/cancellation/failures, avatar validation/fallback and account menu controls, and public content/join regressions. Compiled-loader checks cover anonymous/public/account responses, authorized staff entry, member 403, compatibility redirects, logout, and absence of auth internals in browser bundles.

Real Discord credentials and browser OAuth are not configured by this task. Manual verification remains: Developer Portal/actual callback and consent, member and approved staff accounts, denied member control access, Codespaces forwarding, desktop/mobile menu layout, Tab/ArrowDown/Escape/outside-click focus, CDN avatar failure, expired/revoked-session reload, logout/Back behavior, and all public content/carousel/join paths. The component harness is not a browser viewport test.

Advanced member profiles, account deletion/export UI, Minecraft linking, uploads, staff role editing, content management, cleanup scheduling, and production provisioning remain outside this milestone. No remote migration, deployment, DNS/resource change, push, or merge is performed.

### Recorded Task 03C results

- `npm run test`: all **26 tests** passed.
- `npm run typecheck`, `npm run build`, and `node --experimental-strip-types tests/control-build.mjs`: passed. Compiled checks verified minimal private current-user responses, member account access, member control 403, staff access, anonymous denial, legacy redirects, and shared logout.
- `npm run db:migrate:local`: migration 0005 applied to local D1. Isolated migration tests confirmed existing staff/bootstrap records are unchanged and legacy sessions are invalidated.
- Local anonymous HTTP checks: all eight prior public routes returned 200; login navigation, Discord invitation/widget, and homepage anchors remained present. `/login` provided a disabled, understandable unconfigured state; legacy login redirected safely; account/control failed closed without configuration; mutation GETs returned 405. Public personalized-layout responses remained uncached.
- `git diff --check`: passed. Temporary localhost server stopped. No real credentials or live Discord sign-in, remote migration/resource change, deployment, push, or merge was performed.
