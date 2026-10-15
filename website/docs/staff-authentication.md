# Crunch Control staff authentication (Task 03A)

Implemented on `feature/public-website-routing` after inspecting the clean working tree and completed public/D1 code. The public pages, official Discord invitation/widget, content publication rules, and development demonstration rules are unchanged. No remote resource, Discord application, DNS record, or deployment was created.

## Configuration and local setup

From `website/`, install the existing dependencies if necessary, then:

```sh
npm run db:migrate:local
npm run dev:content
```

Migration `0004_staff_auth.sql` adds staff accounts, opaque sessions, one-use OAuth transactions, a one-time bootstrap marker, and session-revocation triggers. It creates no staff identities or credentials. The original development binding `CONTENT_DB` is reused; default production configuration still has no database binding.

Copy/merge `.dev.vars.example` into the ignored `.dev.vars.content_dev` file; preserve existing settings such as `CONTENT_DEMO_MODE` if present. Configure these server-only bindings:

| Binding | Required configuration |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord application ID, numeric immutable snowflake |
| `DISCORD_CLIENT_SECRET` | Confidential application's OAuth client secret |
| `CONTROL_ORIGIN` | Exact canonical browser origin, e.g. `http://localhost:5173` during local development; no path/query/credentials |
| `AUTH_CSRF_SECRET` | At least 32 characters, generated from a cryptographically random source; recommended 32 random bytes encoded as hex |
| `INITIAL_OWNER_DISCORD_ID` | Optional initial bootstrap: exact numeric Discord user ID of the intended Owner; remove after successful bootstrap |

Never prefix secrets with `VITE_`, commit real environment files, paste credentials into chat, or include credentials/cookies/provider responses in logs. Empty/invalid configuration, missing D1, or missing tables prevents sign-in. The login screen presents an unavailable message and disables its button. `/control` remains inaccessible when authentication is unconfigured.

Local HTTP is accepted only for localhost/127.0.0.1/IPv6 loopback in development mode. Production builds require HTTPS. Bindings are passed through the existing request-scoped Worker context; they are never serialized into loaders or browser bundles. `.dev.vars.content_dev` is ignored by Git. No secrets were generated or configured during this implementation.

### Discord Developer Portal

1. Use an application controlled by the community Owner in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under OAuth2, register the **exact** callback URI: `<CONTROL_ORIGIN>/control/auth/callback` (including scheme, hostname and port). For a browser running locally, this can be `http://localhost:5173/control/auth/callback`. If using 127.0.0.1, register that exact variant and use it consistently.
3. Supply the application client ID and client secret through the ignored local environment file. Keep the application confidential; this flow exchanges codes on the server. A bot, bot token, guild scopes, email scope, and server membership lookup are not needed.
4. Start the application, open `/control/login`, and choose Sign in with Discord. Only `identify` is requested. The application sends S256 PKCE and validates a one-use, browser-bound state before exchanging a code.
5. Test consent cancellation, unauthorized account rejection, the configured initial Owner, logout, and re-login in the browser. The portal/client configuration and Discord's live PKCE exchange still require this manual verification with real credentials; automated tests mock Discord only.

All successful redirects are fixed to `/control`. Errors use fixed messages at `/control/login`; there is no `returnTo`/`next`/redirect-URI override. Discord error descriptions are not reflected into the page.

### Codespaces

Prefer VS Code desktop's private localhost port forwarding and use the actual browser localhost origin above. For a browser-based Codespace, use its exact HTTPS forwarded-port origin, e.g. `https://<codespace>-5173.app.github.dev`, in both `CONTROL_ORIGIN` and the registered callback URI. Start `npm run dev:content -- --host 0.0.0.0 --port 5173 --strictPort`; use one fixed port and one hostname throughout sign-in. A changed Codespace hostname/port requires a matching portal redirect and environment update followed by restart.

Keep the port private and use the same browser's authenticated Codespaces access when following the Discord callback. Discord redirects the browser; it does not need public access to the development port. Vite/Workers debug endpoints and dev source serving are not public production APIs. Do not make a development/debug port public to troubleshoot OAuth. If Vite rejects the forwarded hostname, allow only that exact hostname using Vite's `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` environment setting, not an unrestricted host allowlist.

The installed Cloudflare Vite plugin preserves the Host header and client-facing forwarded protocol. The application itself compares the resulting request origin with configured `CONTROL_ORIGIN`; it does not build authorization/redirect destinations from Host, Origin, or X-Forwarded headers. If the proxy presents a different origin, sign-in fails closed; fix forwarding/canonical-origin configuration rather than disabling checks. HTTPS forwarded origins use Secure cookies even in development.

See [Codespaces forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace), [Codespaces security](https://docs.github.com/en/codespaces/reference/security-in-github-codespaces), and [Cloudflare local secrets](https://developers.cloudflare.com/workers/vite-plugin/reference/secrets/).

## Staff authorization and Owner bootstrap

The three hierarchical roles are **Moderator**, **Administrator**, and **Owner**. Only an explicit active `staff_accounts` record keyed by the verified immutable Discord user ID authorizes access. Usernames/global display names are presentation only; matching them never grants access. Discord community membership or Discord server roles do not automatically grant Crunch Control access. This is not public member registration.

On the first successful verification of `INITIAL_OWNER_DISCORD_ID`, if both the staff table and bootstrap marker are empty, an atomic batch inserts that one Owner and marks bootstrap consumed. Other users cannot trigger it. Existing staff records, a previous bootstrap, or a disabled Owner are never overwritten or automatically re-enabled. Removing the Owner row or changing the configured bootstrap ID does not reset the marker. Remove the bootstrap binding after success. There is no setup URL or role-changing endpoint.

Further grants/role changes are currently an **Owner-controlled, out-of-band database operation** by the Owner or their explicitly authorized trusted database operator. No Moderator/Administrator interface can assign roles. A future role-management action must use `requireStaffAction(..., 'Owner', ...)`, plus transaction/concurrency and security-audit design. Existing content audit tables are not misused to store authentication secrets.

For an Owner-approved local staff grant, use local D1 SQL with the verified actual user ID, one of the three exact roles, and UTC epoch-millisecond timestamps:

```sql
INSERT INTO staff_accounts(discord_user_id, role, created_at, updated_at)
VALUES ('<verified Discord user ID>', 'Moderator', <UTC milliseconds>, <UTC milliseconds>);
```

Execute approved SQL with the existing binding using `npx wrangler d1 execute carrottcrunch-content-local --env content_dev --local --file <owner-approved-local-file.sql>`. Keep staff data files outside tracked source. Do not run these examples against remote resources in this milestone. Revoke access with an Owner-approved `UPDATE staff_accounts SET active=0, updated_at=... WHERE discord_user_id=...`; role or active changes automatically delete that user's sessions and increment the access version. Re-enabling access or changing roles requires a fresh sign-in. Deleting a staff account cascades session deletion. The bootstrap marker intentionally survives deletion.

## Sessions, OAuth and CSRF

- Authorization-code flow, only `identify`, confidential server-side token exchange, and S256 PKCE. Verifiers remain exclusively in D1 until consumption. There is no PKCE downgrade/fallback. Tokens are used only to fetch `/users/@me`, validated before staff authorization, never stored, and revoked on a best-effort basis afterward. Refresh tokens are discarded.
- OAuth state and browser cookie values are independent cryptographically random 256-bit values. D1 stores only their SHA-256 hashes plus the server-side verifier. Transactions expire after ten minutes. An atomic `DELETE ... RETURNING` binds and consumes state before provider I/O, including cancellations. Parallel/replayed callbacks cannot exchange twice. Starting a second flow in the same browser replaces its binding; finish one flow at a time.
- Sessions are fresh random 256-bit opaque bearer values; only SHA-256 hashes are stored. Eight-hour absolute expiry is checked in D1 on every protected loader/action. No localStorage, JWT, refresh flow, or client-side authority is used. Each new successful login rotates the browser's previous session.
- HTTPS cookies are `__Host-cc_session` / `__Host-cc_oauth`, HttpOnly, Secure, SameSite=Lax, Path=/, no Domain. Local HTTP development uses unprefixed cookies without Secure. Lax supports Discord's top-level GET callback; state binding provides callback CSRF protection.
- Session validation joins the current staff row and checks active status, access version, expiry, and explicit revocation. Staff removal, role change, or disable/re-enable cycles invalidate old sessions immediately on their next request.
- Login initiation requires POST, the exact configured request origin and Origin header, and same-origin Fetch Metadata when present. Callback GET is separately guarded by state, browser binding and PKCE. GET requests to login initiation and logout cannot mutate sessions; the validated OAuth callback is the deliberate GET exception.
- Active authenticated mutations additionally require a constant-time-checked HMAC CSRF token bound to that session. It is intentionally exposed only as an anti-CSRF form field/header, not as a session identifier. Accept `_csrf` in URL-encoded forms or `X-CSRF-Token`. Cross-origin/missing-Origin requests fail closed. Never mutate on GET.
- Logout is same-origin POST with CSRF validation for live sessions, atomically deletes the session and any unconsumed browser-bound OAuth transaction, and clears session/OAuth cookies. Already expired/revoked/anonymous logout is idempotent after origin checks, allowing stale cookies to be cleared without granting access.

`app/lib/staff-auth.server.ts` exports `requireStaff(request, env, minimumRole, development)` and `requireStaffAction(...)`. **Every future protected loader/action/API must call its helper independently**; parent-loader checks do not protect parallel child loaders or actions. An unauthorized request throws a generic `AuthError`; routes map it to a safe redirect/403/503 without logging or serializing raw errors. Minimum-role checks are hierarchical, and role assignments require Owner specifically.

`/control` serializes only the current user's display name, username, authorized role, and anti-CSRF token. It never returns Discord IDs, session hashes/identifiers, bindings, provider tokens, or staff records. All auth/control responses are uncached and carry no-referrer, anti-framing, and nosniff headers; pages request no indexing. Automatic Worker invocation logs are disabled in source configuration to avoid recording callback query strings. No hosted observability setting was changed. Any future external proxy/logging infrastructure must also redact callback codes/state and Cookie/Authorization headers.

## Files and validation

- `migrations/0004_staff_auth.sql`: accounts, bootstrap marker, sessions, OAuth transactions, indexes and access-change trigger.
- `app/lib/staff-auth.server.ts`: configuration, OAuth/PKCE, identity verification, bootstrap, sessions, roles, CSRF, logout.
- `app/lib/cloudflare-context.server.ts`: typed authentication bindings in the existing Worker context.
- `app/routes.ts`: control route registration.
- `app/routes/control.tsx`, `control-login.tsx`, `control-auth-start.ts`, `control-auth-callback.ts`, `control-logout.ts`: protected landing, login, and resource routes.
- `app/components/control-shell.tsx`, `app/app.css`: scoped branded staff presentation.
- `wrangler.jsonc`: suppress invocation URL logs; existing environments/bindings retained.
- `.dev.vars.example`: blank, intentionally nonworking configuration template.
- `tests/staff-auth.test.mjs`: real isolated local D1 with mocked Discord; no real staff users or credentials.
- `tests/control-build.mjs`: post-build verification of protected loader/action behavior, safe welcome data and server-only browser bundles.
- `README.md`, this file: setup, security model, manual checks and limitations.

Required validation from `website/`: `npm run test`, `npm run typecheck`, `npm run build`. After building, run `node --experimental-strip-types tests/control-build.mjs` for the compiled-route checks. Apply only local migrations with `npm run db:migrate:local`. Tests exercise configuration failure, unauthorized access, all role boundaries, PKCE/browser binding, replay including concurrent replay, token/identity errors, cancellation, expiration, revocation, role changes, disabling/re-enabling, one-time bootstrap, CSRF, logout, and public News & Events/Discord regression checks.

Live Discord credentials and real identity authorization have not been configured here; a real browser OAuth round trip remains required. The code supports that flow, but mocked tests cannot validate your Developer Portal, Codespaces proxy, browser cookies, or actual Discord consent settings. Additional manual checks: keyboard/mobile/focus, permission failures, browser Back after logout (reload must deny), expired/revoked sessions, public page/carousel/Discord behavior, and seeded News & Events.

Future scope includes staff management UI and audit policy, stronger operational monitoring/rate controls, optional MFA/step-up policy, cleanup scheduling for expired sessions/abandoned OAuth records, and all Content Studio/Media Library/server operations. Expiration is enforced even without cleanup. No rate-limiting or production secrets/database provisioning is included. Production rollout needs explicit authorization and separate infrastructure/security review; this task does not deploy.

Protocol references: [Discord OAuth2 and identify scope](https://discord.com/developers/docs/topics/oauth2), [Discord PKCE documentation issue](https://github.com/discord/discord-api-docs/issues/5254), [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636), [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700).


### Recorded Task 03A results

- `npm run test`: all **20** tests passed, including public content/Discord regressions and staff security cases.
- `npm run typecheck` and `npm run build`: passed.
- `node --experimental-strip-types tests/control-build.mjs`: passed against the compiled protected loader/action with isolated D1 and mocked Discord. Verified anonymous denial, minimal Owner welcome data, logout invalidation, and absence of auth secrets/server code from browser bundles.
- `npm run db:migrate:local`: migration 0004 applied successfully to persistent local D1, without inserting staff identities.
- Local HTTP checks: all eight existing public routes returned 200; homepage anchors, Discord widget and invitation remained present. Unconfigured `/control` failed closed; login was disabled with a clear message; GET login-start/logout returned 405; callback failures redirected safely; no-store/no-referrer headers were present.
- `git diff --check`: passed. Temporary HTTP server stopped. No real credentials, staff bootstrap, live provider exchange, production resource operation, push, merge, or deployment was performed.

Requests already executing at the time of revocation can finish; each subsequent protected request revalidates D1. Logout cancels unconsumed OAuth attempts and the current session. Future business mutations must also check authority within their transaction/concurrency design. Live Discord/Codespaces/browser verification remains outstanding as described above.

## Task 03C compatibility update

Authentication is now shared by ordinary members and staff. See [Unified Discord authentication](unified-authentication.md) for the current schema, public `/login` and `/account`, migration-required fresh sign-in, shared site sessions, unchanged Owner bootstrap, and separately enforced staff permissions. The callback URI and existing credentials are retained. The staff-only sign-in descriptions above are historical.
