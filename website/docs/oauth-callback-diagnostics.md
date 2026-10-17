# Discord callback diagnostics

Development callback failures emit one server-side line:

```text
[auth-callback] {"stage":"code-exchange","category":"http","status":401}
```

This is an illustrative example, not an observed provider failure. Production emits
no callback diagnostics. Public redirects, response bodies, cookies, and security
checks are unchanged. Logs contain only fixed stage/category labels and, for an
unsuccessful provider response, its HTTP status. They never include caught errors,
request URLs, OAuth state/codes, cookies, tokens, identities, secrets, or provider bodies.

Reproduce a fresh login in development and read only this line from the server
terminal. A consumed callback cannot be replayed; start a new sign-in each time.
Do not share browser callback URLs, network captures, or complete server logs.

| Stage | What to check after observing this stage |
| --- | --- |
| `route-context` / `configuration` | Local worker context and required binding/configuration availability. |
| `callback-validation` | Callback host, GET method, unique parameters, browser cookie, and valid code; consent errors are separately categorized. |
| `oauth-transaction` | `invalid-transaction`: expiry, replay, or browser binding mismatch. `database`: local OAuth table/schema availability. |
| `code-exchange` | `network`: server connectivity/timeout. `http`: verify the Discord app credentials and registered redirect URI locally, and retry a fresh authorization code. Status alone does not prove a particular configuration mistake. |
| `token-validation` | Response JSON and existing access-token, Bearer, exact `identify` scope, and positive expiry requirements. Do not relax validation based only on this label. |
| `user-lookup` | HTTP/network failure of `/users/@me`, or JSON/identity validation (`invalid-response`). |
| `owner-bootstrap` | Local `staff_accounts` and `staff_bootstrap` schema and constraints. |
| `account-session` | Local `site_users` / `site_sessions` migrations and constraints; `internal` means session material generation failed before the D1 batch. |
| `staff-role` | Local `staff_accounts` schema/query. No staff row is a successful member login, not a failure. |

Use the existing local migration workflow only if a database failure is confirmed
and schema inspection shows missing migrations. Do not change production data or
re-bootstrap an existing owner as a diagnostic step.

`/login?error=failed` alone cannot identify the failing stage. The diagnostic from
the actual development callback is required before claiming a confirmed cause.
