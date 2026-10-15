# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.

## CarrottCrunch homepage milestone

The homepage uses reusable TypeScript components in `app/components/community.tsx` and local SVG concept artwork in `public/images/overworld.svg`. The bitten-C mark and favicon are temporary brand placeholders. Gallery artwork is illustrative, not a record of actual community builds.

The showcase rotates every seven seconds, with previous/next, direct selection, and pause controls. Hover or keyboard focus pauses rotation; reduced-motion preferences disable automatic rotation. The responsive navigation and skip link support keyboard use.

CarrottCrunch has an established Discord community and an existing modded Minecraft Create server. The official Discord invitation is available through `/join`; Minecraft connection details are not published here; live status and administrator functionality remain disabled. The official public Discord widget is embedded in The Hangout; other live integrations and databases remain unconfigured. Existing Cloudflare and React Router configuration is retained.

Run locally with `npm run dev`. Validate with `npm run typecheck` and `npm run build`. Do not run `npm run deploy` for local validation. In restricted environments, Wrangler's optional log path can be set to a writable directory with `WRANGLER_LOG_PATH=/tmp/carrottcrunch-wrangler`.

### Homepage imagery and behavior

Each typed showcase slide declares its own local `image` path in `app/components/community.tsx`: `overworld.svg`, `create-workshop-placeholder.svg`, and `after-hours-placeholder.svg`. All three are illustrative placeholders, not community screenshots. Replace individual paths with approved local screenshots when available, and update the placeholder label accordingly. The gallery still uses the original concept illustration. The existing bitten-C logo remains a temporary placeholder.

Navigation stays sticky and becomes translucent after scrolling. Mobile links close the menu; Escape closes it and restores focus to the menu toggle. Hover and keyboard focus independently suspend the carousel, and its pause button keeps rotation paused until resumed. Reduced motion disables automatic rotation. The official Discord widget and invitation are the enabled community connections.

### Visual personality refinement

`app/personality.css` layers brand styling over the existing layout in `app/app.css`: orange, coral and green accents; local display-font fallbacks; asymmetrical rounded details; and subtle hover/press feedback. No additional fonts, services or dependencies were added. `CrunchMark` reuses the existing temporary bitten-C paths, and typed `FeatureCard` accents keep card treatments consistent. Decorative SVGs are hidden from assistive technology and ignore pointer input. Reduced-motion preferences disable the added motion; the separate invite button now leads to `/join`.

Validation: `npm run typecheck` and `npm run build` passed with Wrangler logs directed to `/tmp/carrottcrunch-wrangler`. A temporary component-level interaction harness checked carousel selection/wraparound, pause/resume, hover/focus overlap, automatic advance, reduced motion, mobile toggle/link/Escape behavior, restored menu focus, scroll state and anchor targets. This is not a browser rendering test; visual and device testing remains outstanding.

### The Hangout / official Discord widget

The homepage embeds Discord’s official dark widget for server `1449232300758929513` after the community introduction and before the gallery. `app/components/discord-widget.tsx` provides a reusable, typed `DiscordWidget` with an accessible iframe title, lazy loading, a responsive width and a 500px height. Its sandbox is exactly `allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts`. The section uses two columns on desktop and stacks on mobile.

The widget loads public content directly from Discord; Discord controls availability and any links displayed inside it. The server owner must enable the server widget in Discord for it to display. No bot token or private API is used. The separate join button leads to `/join`, which presents the validated official invitation. Minecraft live status remains disabled. No deployment was performed.

## Public website routing milestone

Public routes: `/`, `/community`, `/servers`, `/gallery`, `/updates`, `/about`, and `/safety` share `app/routes/public-layout.tsx`. `/join` retains its independent handoff page and server-side invitation validation. The invitation destination appears only in `app/config/discord.server.ts`; no query parameter controls it.

The shared header uses React Router links with active-page indication. Mobile navigation retains Escape-to-close and focus restoration. Route changes focus the main landmark; the skip link and footer top link work on each shared-layout page. Homepage IDs `home`, `community`, `hangout`, `gallery`, `news`, `server`, and `join` remain available for existing bookmarks.

New pages use `PublicPage` and typed `PublicPageContent`/`PublicSection` props. Initial content lives in `app/content/public-pages.ts`; future Content Studio data can supply those props without replacing page layouts. Content Studio, databases, authentication, uploads, and administration are not implemented. Unpublished content is labelled as placeholder content. The bitten-C mark remains temporary.

CarrottCrunch.ca is the intended registered domain. Internal URLs are origin-relative so they work locally and on that domain. No DNS, hosting, canonical-host redirects, or production infrastructure was changed. Canonical URLs and a sitemap can be added when the production origin and publishing policy are configured.

Manual browser checks: open and reload every route; check desktop/tablet/mobile navigation, active links, Escape and focus behavior, skip links, back/forward navigation and footer top links. Verify old homepage hash bookmarks, carousel rotation/pause/reduced-motion behavior, Discord widget rendering, and every join action through the external Discord invitation. Automated checks cannot confirm Discord invitation validity or visual rendering.

## Content database foundation (Task 02A)

Local-only D1 migrations, typed server utilities, immutable revision/audit history, and explicitly fictional development seeds are available. The existing public page content and Discord invitation remain unchanged. See [local setup, schema, safety boundaries, and testing](docs/content-database.md). No production database is configured.

From `website/`, run `npm run db:migrate:local`, optionally `npm run db:seed:local`, then `npm run dev:content` to provide the local binding. Seeds never run automatically and are always excluded from public content queries. Validate with `npm run test`, `npm run typecheck`, and `npm run build`; do not deploy.

## Dynamic News & Events (Task 02B)

The homepage news column, `/updates`, and stable `/updates/:announcementId` articles now use server-side D1 loaders. Published events display Upcoming, In progress, Completed, or Cancelled with their stored timezone and UTC offset. Rich text uses an escaped, restricted Markdown subset. Existing page designs, homepage anchors/carousel, and Discord joining are preserved.

See [dynamic content setup, demonstration mode, files, and validation](docs/dynamic-news-events.md). Run the local migrations and optional seeds, then `npm run dev:content`. Fixtures stay hidden unless explicitly enabled in development and remain hard-disabled in production builds. Earlier Task 02A notes describe that milestone's historical behavior; Task 02B now connects the read-only public experience. No production D1 binding or deployment was added.

## Secure Discord staff authentication (Task 03A)

Crunch Control now has a branded `/control/login` and server-protected `/control` welcome page. Discord authorization-code authentication requests only `identify`, uses S256 PKCE and one-use browser-bound state, and grants sessions only to explicitly authorized immutable Discord user IDs. D1 stores hashed opaque sessions with expiry/revocation; active mutations require same-origin CSRF protection. Roles are Moderator, Administrator and Owner. No role-changing or public registration endpoint is provided.

See [configuration, initial Owner bootstrap, Codespaces setup and testing](docs/staff-authentication.md). Apply the local migration with `npm run db:migrate:local`; configure ignored `.dev.vars.content_dev` using the blank `.dev.vars.example` template and your Discord Developer Portal callback, then run `npm run dev:content`. Missing configuration fails closed. Real Discord browser sign-in still requires your credentials and manual verification. Public pages, joining, and News & Events publication rules are unchanged. Nothing was deployed.
