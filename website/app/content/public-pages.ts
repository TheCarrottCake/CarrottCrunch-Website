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
  "description": "CarrottCrunch community screenshots and creative highlights.",
  "sections": [
    {
      "title": "Community screenshots",
      "text": "No community screenshots are published here yet. The illustrated previews on the homepage are concept artwork, not actual community builds.",
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
  "title": "About CarrottCrunch",
  "eyebrow": "A little crunch. A lot of community.",
  "description": "CarrottCrunch is a small gaming community with a long history, familiar faces, and plenty of stories to tell. We've gone through different names, different servers, and different chapters, but one thing has always stayed the same: the people who make it worth coming back to.",
  "sections": [
    {
      "title": "Many names. One community.",
      "text": `CarrottCrunch wasn't always CarrottCrunch.

Our roots go back to The Boop's Discord, and over the years we've gone by names like CarrottCrazeHQ and The Rooted Realm, along with plenty of changes in between.

Minecraft servers have come and gone. SMPs have been born, grown, and eventually said their goodbyes. We've welcomed new faces, seen different groups come together, and shared more than a few memorable adventures.

Some members have been around since the very beginning. Others have joined somewhere along the way.

Every version of this community has left something behind, whether it's an old Minecraft world, an inside joke, a friendship, or just a good memory.

And now, here we are. CarrottCrunch.`
    },
    {
      "title": "More than just games",
      "text": `Life gets busy. We all have work, school, responsibilities, and things going on outside our screens.

That's okay.

CarrottCrunch isn't about having to be online every day or keeping up with everyone all the time. It's about having somewhere familiar to come back to.

A place for gamers, friends, players, and even opponents to get together. Play a few games, jump into a voice chat, share some gossip, discuss the latest game updates, show off something you've built, or just hang out.

Whether you're here for Minecraft, another game, or simply the people, you're welcome to pull up a chair.

Come for the games. Stay for the people.`
    },
    {
      "title": "A word from the founder",
      "text": `Hey! I'm TheCarrottCake, but most people just call me Carrott.

I'm the founder of CarrottCrunch.

I joined Discord back in 2016, and for as long as I can remember, I've been interested in hosting and growing an online community of my own.

Over the years, that idea has taken many different forms. Different Discord communities, different names, different Minecraft servers, and plenty of experiments along the way.

Some things worked out, some didn't, but I've had a lot of fun through it all.

And now, here we are with CarrottCrunch.

We're not a big community, but I think we've got a pretty good one.

Looking ahead, I'd love to continue growing CarrottCrunch alongside the people who make it what it is. More games, more adventures, more memories, and hopefully plenty of new friends along the way.

So whether you've known us for years or you're just discovering us for the first time, come stop by and say hi.

Or better yet, jump into a VC.

See you around!

— TheCarrottCake (Carrott)`
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
