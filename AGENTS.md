# CarrottCrunch — Project Agent Rules

These rules apply to work in this repository. Read the current code and `git status` before making changes; preserve working functionality and uncommitted work. Follow the user's explicit instructions for each task.

## Identity and design

- Spell the community brand **CarrottCrunch** (double **r** in "Carrott"). **TheCarrottCake** is the owner's separate personal creator/admin identity; never substitute it for the community brand.
- Use the **official bitten-C CarrottCrunch SVG**, located at `website/public/branding/carrottcrunch-icon.svg`, and its related favicon assets. Do not reintroduce placeholder logos or arbitrarily redraw the mark. Keep SVG paths editable and preserve their proportions.
- Maintain the approved **Apricot Glow** palette through reusable semantic CSS variables:
  - Page background: `#FFE8D2`
  - Cards and surfaces: `#FFF8ED`
  - Primary text: `#35251F`
  - Primary action / burnt orange: `#B64223`
  - Supporting orange: `#F4A453`
  - Dark surfaces: `#44271F`
  - Text on dark: `#FFF5E9`
  - Muted brown: `#70513F`
  - **Leaf Sage / foliage accent: `#6C8056`**
- Apply Leaf Sage to the logo's leaves and sparingly to intentional nature-themed accents across the public site and Crunch Control. Orange remains the primary call-to-action colour. Do not turn the entire site green; check contrast at small icon and text sizes. Supporting orange and muted colours must not become unreadable small text.
- Keep the **public website, Discord login, and member pages light**. Preserve the **deliberate darker treatment of Crunch Control**, including its existing mixed dark/light surfaces. Do not globally invert or flatten either design.
- Aim for premium, modern gaming design with cozy-fantasy warmth and restrained playful details. Use responsive, accessible, typed React components; support keyboard navigation, focus visibility, semantic landmarks, labels, reduced motion, and accessible modal/menu focus handling.

## Application and existing features

- The application lives in `website/` and uses **React Router, React, Vite, TypeScript, Tailwind, Cloudflare Workers, D1, and R2**. Preserve the existing configuration and architecture. Run npm commands from `website/`, not the repository root.
- The public site, Discord OAuth/member accounts, role-protected **Crunch Control**, private Media Library, announcement editor (05A), event editor (05B), and review/publishing workflow (05C) **already exist**. Inspect and reuse their actual implementations; do not describe them as future or placeholder features.
- The official domain `CarrottCrunch.ca` has a live teaser. Do not change the live site, production bindings, or launch state without explicit authorization.
- Crunch Control's personalized welcome belongs **only on Overview**. Tool pages use compact contextual headers. Prefer a consolidated top editor action toolbar over duplicated controls scattered down the page; keep actions role- and state-aware, with confirmations for destructive/public actions.
- Keep unfinished features (for example, public staff directory management and activity-history management) clearly distinguished from shipped features. Never invent community activity, user counts, testimonials, game/server status, addresses, or Discord invitations. Label development-only fixtures honestly and do not expose them as real public content.

## Staff authorization and publishing

- Roles are **Moderator**, **Administrator**, and **Owner**. Enforce permissions **server-side on every loader/action**, not merely by hiding buttons. Preserve Discord authentication, session validation, same-origin CSRF protection, and private/no-store responses where required.
- Content Studio V2 uses **Create → Preview → Publish**, without publication approvals. Moderators, Administrators and Owners may create/edit, publish, schedule and unpublish posts/events and manage homepage/gallery content. Administrator/Owner-only cleanup and unrelated administrative safeguards remain restricted server-side.
- Preserve separate **private working revisions** and **live published revisions**. Save Draft never silently changes a live release. Public queries must not leak drafts, future releases, fixtures, private media or audit data. Retain historical approvals as audit/migration records, never as a V2 publication gate.
- Maintain immutable revision/decision/audit history, guarded transactional writes, optimistic concurrency checks (HTTP 409 with user input preserved), and safe deletion/archive semantics. Do not bypass workflow services with direct state changes.
- User-facing event and publication scheduling uses **America/Toronto**, a calendar, and **15-minute AM/PM** options. Store instants in UTC internally. Handle DST gaps and ambiguous repeated times safely, without exposing raw timestamps or routine timezone settings.
- Scheduled publishing runs through the existing **Cloudflare Worker Cron** mechanism, independently of visitors. Preserve idempotency, bounded due-item processing, cancellation, exact release/revision checks, and authorizing-role checks. Never assume local dev automatically runs Cron; test it explicitly.

## Data, security, and deployments

- Treat local D1/R2 state and existing data as valuable. Current local migrations include `0007` and `0008`; use **additive, reviewed migrations** for new changes. Do not reset, overwrite, reseed, or delete databases or media without explicit authorization.
- Media Library assets are private by default and shared by all Content Studio features. Upload metadata is optional. Public delivery requires a current authorized live release and exact media reference, never an approval queue. Creator credits appear by default only in Community Gallery; mandatory third-party attribution and licence restrictions must still be respected everywhere. Preserve restricted Markdown rendering and safe link handling; do not inject unsanitized HTML.
- Keep secrets and local state out of Git, especially `.dev.vars*`, `.wrangler/`, `node_modules/`, credentials, tokens, and environment-specific private files. Do not print secrets in logs or reports.
- **No automatic commits, pushes, merges, production deployments, remote D1 migrations, R2 changes, or Cron activation.** Obtain explicit approval before any remote/production change. Local implementation and local-only verification are allowed when requested.
- Avoid unnecessary dependencies and unrelated refactors. When changing shared services or UI, protect existing auth, Media Library, content editors, publishing, and public-site behaviour.

## Verification and handoff

- After implementation, run the relevant automated tests, `npm run typecheck`, and `npm run build` **from `website/`**. Run applicable built-route, authorization/CSRF, concurrency, public-isolation, UI/accessibility, and local Worker/Cron checks. Never use deployment as a validation step.
- Inspect `git diff --check` and summarize **what changed, test results, migrations, any remaining manual checks, and known limitations**. If tests or runtime checks cannot run, state that plainly.
- Before suggesting commits, have the user review staged paths and verify no secrets/local state are included. Do not commit or push unless explicitly instructed.
