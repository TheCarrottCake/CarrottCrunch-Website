# Milestone 05A — Announcement Studio

Milestone 05C extends this editor with explicit review and publication. See [Publication workflow](publication-workflow.md); the original milestone notes below describe its draft-only starting point.

Community event drafting is now covered by [Milestone 05B](event-studio.md). The following records the original 05A scope; announcement URLs and workflows remain supported.

News & Events now opens a staff-only announcement workspace at `/control/news`.
Moderator, Administrator and Owner accounts can search titles/summaries, create
drafts, edit drafts, preview restricted Markdown and view the latest 20 revision
entries. All earlier revisions and audit entries remain stored. Publishing and
event creation are not implemented. There are no image attachments or Media
Library changes.

## Storage and safeguards

- Migration `0007_announcement_summaries.sql` adds only
  `announcements.summary`, with an empty default and a 600-character bound.
  Existing content, publication states, events, history and audits are preserved.
  Historical snapshots without a summary remain unchanged.
- Draft title/summary/body limits are 160 / 600 / 40,000 characters. Title,
  summary and body are required. The server bounds URL-encoded requests at
  256 KiB and rejects duplicate fields and unsupported intents. A UUID-based
  internal slug is generated at creation; users cannot set publication fields.
- Every page requires Moderator or above. Every mutation independently verifies
  the role, session, exact Origin and session-bound CSRF token before reading or
  reflecting editor content. Private responses use `private, no-store`, `Vary:
  Cookie`, the authentication security headers and `noindex` metadata.
- Only non-fixture announcement drafts with no publication timestamp are editable.
  Published/review/scheduled/archived records, events and fixtures are excluded.
  Public queries and public page components are unchanged.
- Creation and saves atomically append immutable snapshots and audit entries.
  Saves compare the submitted revision inside the D1 transaction. A concurrent
  save or state change rolls back the entire transaction and returns HTTP 409.
  No overwrite or force-save option is provided.
- Validation and save errors return the submitted title, summary, Markdown and
  revision to the authorized editor. A 409 disables saving that stale form and
  provides a link to compare the latest draft in another tab. Copy work before
  reloading; unsaved text is not stored across navigation or browser reloads.
- Previews use the same `ContentBody` component as public articles. Raw HTML,
  scripts and executable embeds remain escaped text. Summary/title render as
  plain text. No raw HTML API or extra Markdown dependency is used.
- Author and last-editor names come from existing account presentation data when
  available; missing/legacy names display an honest fallback. Actor identifiers,
  authentication data and complete audit payloads are not sent to the browser.

## VS Code manual testing (PowerShell)

Open the repository in VS Code and use its integrated terminal:

```powershell
cd website
npm.cmd run db:migrate:local
$env:CLOUDFLARE_ENV = 'content_dev'
npm.cmd run dev -- --port 5173
```

Migration 0007 has already been applied locally during implementation; rerunning
the migration command is safe. It always targets local `content_dev` D1. Do not
run the seed command. Use the existing verified local OAuth configuration and
open its configured origin (normally `http://localhost:5173`). If port 5173 is
occupied, stop the previous VS Code development task before starting another;
do not use a different origin accidentally. No secret changes are required.

1. Sign in with the existing authorized Discord account, open Crunch Control,
   then **News & Events**. Verify the tool is available alongside Media Library.
2. Choose **New announcement**. Enter your own clearly marked local test title,
   summary and Markdown body. Check the live preview, then **Save draft**.
   Confirm the private-draft label, revision 1, author and timestamps.
3. Reload the page to verify persistence. Change all three fields, save again,
   and confirm revision 2 and a second immutable history entry.
4. Return to the draft list and search a phrase from its title or summary.
   Check the empty state with an unmatched phrase. Search is literal, including
   `%` and `_`; results are paginated in batches of 24.
5. Open the same draft in two tabs. Save a change in tab A. In tab B, type a
   different change and save the old revision. Confirm HTTP 409 in the browser
   Network panel, preserved text, and the conflict message. Open the latest draft
   with the comparison link; tab A's save must remain intact. Copy your desired
   text into the latest form to resolve the conflict deliberately.
6. Clear a required field and attempt to save; the browser should label it as
   required. Server-side invalid/oversized fields and preservation are also
   covered automatically, including requests that bypass browser validation.
7. Try a body containing `<script>alert(1)</script>`, raw image HTML and
   `[unsafe](javascript:alert(1))`. The preview must not execute code or create
   an unsafe link/image. Compare headings, lists, emphasis, code and safe links
   with the established public Markdown format.
8. In a signed-out/private browser window, try all three studio URLs. Access
   must be denied. If an ordinary non-staff account is available, repeat with
   it. For a local CSRF check, remove the editor's hidden `_csrf` input using
   browser Elements tools and submit: expect HTTP 403 and no new revision.
   Do not copy or share CSRF values, cookies or browser network captures.
9. Check `/updates` and the homepage before/after draft edits. Existing eligible
   published content must be unchanged; drafts must not appear. Opening
   `/updates/<draft UUID>` must show article-not-found.
10. Check narrow/mobile layouts and keyboard-only tab navigation. Labels, search,
    editor controls, preview and revision history should remain readable, with
    visible focus. Check that the working Media Library still opens normally.

## Automated verification

From `website/`:

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types tests/control-build.mjs
```

The test suite uses isolated, nonpersistent local D1 with an explicit empty env
fixture. It applies the actual migrations, verifies backward compatibility and
transaction rollback, forces simultaneous saves after both have read the same
revision, exercises all staff roles/denials/CSRF failures and checks preserved
submissions. Preview tests compare output with the shared public renderer.
Built-route checks exercise the real studio loaders/actions and verify that
public article/list routes cannot expose created drafts. Existing public
publication filtering, authentication and private media tests remain included.

If sandbox logging/registry writes are restricted, point `WRANGLER_LOG_PATH`
and `WRANGLER_REGISTRY_PATH` to temporary directories before these commands.
No remote migrations, commits, pushes, merges or deployments are part of validation.
