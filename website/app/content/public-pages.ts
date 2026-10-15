import type { PublicPageContent } from "../components/public-page";

export const publicPages = {
  community: {
  "title": "Community",
  "eyebrow": "Good games. Great company.",
  "description": "Explore CarrottCrunch, an established Discord community with a shared love of games and creativity.",
  "sections": [
    {
      "title": "A place to connect",
      "text": "Find the official invitation through our Join Discord page. The homepage also includes the official public Discord widget.",
      "placeholder": false
    },
    {
      "title": "Community guide",
      "text": "A fuller introduction to community spaces and activities has not been published here yet.",
      "placeholder": true
    }
  ]
},
  servers: {
  "title": "Servers",
  "eyebrow": "Build your world",
  "description": "CarrottCrunch has an existing modded Minecraft Create server. Published connection information will appear here when available.",
  "sections": [
    {
      "title": "Minecraft · Create",
      "text": "Gears, machinery, and creative building are at the heart of Create. This page introduces the existing server without displaying live status.",
      "placeholder": false
    },
    {
      "title": "Connection details",
      "text": "The server address, supported version, modpack details, and joining instructions have not been published here. No live server status is connected.",
      "placeholder": true
    }
  ]
},
  gallery: {
  "title": "Gallery",
  "eyebrow": "Small blocks. Big imagination.",
  "description": "A future home for CarrottCrunch community screenshots and creative highlights.",
  "sections": [
    {
      "title": "Community screenshots",
      "text": "No approved community screenshots are published here yet. The illustrated previews on the homepage are concept artwork, not actual community builds.",
      "placeholder": true
    },
    {
      "title": "Creative highlights",
      "text": "Build stories and other creative highlights will appear here when content is available.",
      "placeholder": true
    }
  ]
},
  updates: {
  "title": "Updates",
  "eyebrow": "Fresh from the patch",
  "description": "A place for published CarrottCrunch news and website updates.",
  "sections": [
    {
      "title": "Community news",
      "text": "No community news articles are published on this page yet. Events and announcements will be shown when confirmed content is available.",
      "placeholder": true
    },
    {
      "title": "Website progress",
      "text": "Explore the current website introduction on the homepage. A dedicated update archive has not been published yet.",
      "placeholder": true
    }
  ]
},
  about: {
  "title": "About",
  "eyebrow": "A little crunch. A lot of community.",
  "description": "CarrottCrunch brings an established Discord community and a modded Minecraft Create server together on the web.",
  "sections": [
    {
      "title": "CarrottCrunch",
      "text": "This public website is a place to explore the community and find its official Discord invitation.",
      "placeholder": false
    },
    {
      "title": "Our story",
      "text": "A detailed community history has not been published here yet.",
      "placeholder": true
    },
    {
      "title": "Brand artwork",
      "text": "The bitten-C logo and favicon are temporary placeholders. Homepage showcase and gallery illustrations are concept artwork.",
      "placeholder": false
    }
  ]
},
  safety: {
  "title": "Safety",
  "eyebrow": "Look out for each other",
  "description": "Find the official invitation and general online safety guidance here. Community-specific policies have not yet been published on this website.",
  "sections": [
    {
      "title": "Use the official invitation",
      "text": "Use the Join Discord link on this website to reach the configured official invitation. Be cautious with unsolicited links and requests for passwords or account tokens.",
      "placeholder": false
    },
    {
      "title": "Community policies",
      "text": "Community-specific rules, joining requirements, and moderation procedures have not been published here yet. This page does not establish new community rules.",
      "placeholder": true
    },
    {
      "title": "Reporting information",
      "text": "A dedicated reporting contact or website reporting form is not available here. For immediate danger, contact your local emergency services.",
      "placeholder": false
    }
  ]
},
} satisfies Record<string, PublicPageContent>;
