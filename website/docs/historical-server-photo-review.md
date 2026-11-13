# Historical server photos - review and integration

November 11, 2026 (America/Toronto). Correct C: checkout and
`feature/cinematic-redesign-v3`, HEAD `f556f0c`; ongoing uncommitted 7A/7B retained.
Initial review preserved nine originals. After owner identification, Joel's portrait (`IMG_0505.png`) was moved to a verified private backup outside
the repository. Eight unrelated originals remain unchanged; their hashes pass. No exact hash duplicates; visual
review found related characters/scenes but no duplicate photographs. All 14 GIF
frames were reviewed. No date, builder, server name or person's identity is inferred.

## Review artifacts

- [Local contact sheet with original filenames](../.wrangler/historical-photo-review/contact-sheet.png)
- [All 14 GIF frames](../.wrangler/historical-photo-review/gif-contact-sheet.png)
- [About slot crop proposals](../.wrangler/historical-photo-review/about-slot-crop-proposals.png)
- [Machine-readable photo inventory](historical-server-photo-inventory.json)
- [Public-copy source/optimization manifest](historical-server-photo-assets.json)

Contact sheets include private portrait material and remain ignored local review
artifacts, not website assets. Review copies do not replace the original files.

## Current original inventory (eight files)

| Filename | Format | Dimensions | Bytes | Frames |
| --- | --- | --- | --- | --- |
| `ezgif-5-5d73f5ff4c.gif` | GIF | 450 x 231 | 511,740 | 14 |
| `Love.png` | PNG | 3840 x 2160 | 1,837,854 | 1 |
| `Minecraft 11_18_2018 2_16_01 PM (1).png` | PNG | 1439 x 820 | 993,431 | 1 |
| `Minecraft 11_19_2018 4_04_48 PM.png` | PNG | 1440 x 860 | 857,035 | 1 |
| `New Icon.png` | PNG | 1920 x 1080 | 2,454,751 | 1 |
| `New WP Jinxed.png` | PNG | 3840 x 2160 | 4,399,692 | 1 |
| `novaskin-wallpaper-3players.png` | PNG | 1920 x 1080 | 1,646,775 | 1 |
| `unknown.png` | PNG | 157 x 220 | 106,719 | 1 |

Total remaining original bytes: 12,807,997. No source is independently verified as showing the
current Create server. No visible Create machinery was identified. The supplied
previous-server context is owner-provided, not a date/server identification.

### ezgif-5-5d73f5ff4c.gif

Fourteen inspected frames show a dancing lineup of animal-like avatars and a human-like avatar against a blue sky. No Minecraft builds or machines.

Unknown; not evidence of a current or historical Minecraft server.

Quality/crop: 450x231 is small; animated/moving and visibly compressed.

Privacy/rights: Avatar/model ownership and participant context unknown; no visible server address or credentials.

Decision: Exclude from website; unrelated to the historical Minecraft story and requires source/model rights review.

### Love.png

Stone hall with tall coloured windows, candles, wooden seating, red runner and posed Minecraft characters.

Historical collection per owner; precise event, date, world and renderer unknown.

Quality/crop: 3840x2160; crisp wide composition, group spread across frame.

Privacy/rights: No visible chat, player names, address or credentials. Personal/ceremonial context and artwork authorship need identification.

Decision: Hold for owner context and creator permission; possible later Gallery entry. Do not call it a wedding or identify participants without confirmation.

### Minecraft 11_18_2018 2_16_01 PM (1).png

Grouped Minecraft avatars in a wood-and-stone hall with pale floor, foliage and dark red trim. No identifiable Create machinery.

Historical per owner. Filename contains a 2018 timestamp; not independently verified capture history.

Quality/crop: 1439x820; strongest readable group composition. Central group survives an About opening 3:2 crop.

Privacy/rights: No visible usernames, chat, address, account credentials or real faces; skin/participant context and captured-by credit unknown.

Decision: First choice for About Memories opening; Gallery history candidate, pending normal staff import/rights/credit review.

### Minecraft 11_19_2018 4_04_48 PM.png

Minecraft avatars grouped between stone pillars with timber/foliage surroundings, lantern-like light blocks and cobweb decorations.

Historical per owner. Timestamp is only in filename; world/date/participants unconfirmed.

Quality/crop: 1440x860 with generic Minecraft window title bar. Private proposed copy removes top 32px, yielding 1440x828. Group is smaller/darker than the hall shot.

Privacy/rights: No visible chat, player name tags, server address or credentials. Window title is generic, not sensitive.

Decision: Second Gallery history candidate / alternate About opening. Use the cleaned private import copy after review; do not assume it is the same event as the other group shot.

### New Icon.png

Large tree forms, elevated wooden structures and small lights in a misty landscape at dusk. No HUD, names, people or obvious machines.

Historical previous-server collection per owner; exact date, world, builder and capture method unknown.

Quality/crop: 1920x1080. Atmospheric but dark; works as contextual landscape rather than detailed engineering evidence.

Privacy/rights: No visible private information or watermark. Filename is misleading: this is a landscape, not official branding.

Decision: Selected for the Servers Hub historical context figure; second choice for About history slot and Gallery. Only the two optimized copies are public.

### New WP Jinxed.png

Posed avatars beside a tree, planted steps, stone blocks and lanterns in a wooded night scene; some edge characters are cut by the original framing.

Historical collection per owner, but date, scene, characters and renderer unconfirmed.

Quality/crop: 3840x2160; detailed but dark and tightly framed. Additional tight crops would lose characters.

Privacy/rights: No visible private text or server address; character identity/skin/artist permissions unknown.

Decision: Hold for creator/context confirmation; possible future Gallery artwork, not proof of an actual server moment or current Create gameplay.

### novaskin-wallpaper-3players.png

Three posed block characters on a sandy/wooden edge beside a leafy tree; visible Nova Skin mark at lower right.

Unknown; filename and watermark suggest rendered wallpaper, not verified server capture.

Quality/crop: 1920x1080, clear but foreground characters occupy most of frame.

Privacy/rights: Visible third-party mark; template/render and skin rights not established.

Decision: Exclude pending verifiable permission/attribution. Do not crop off the watermark as a substitute for permission.

### unknown.png

Small portrait of a person under coloured lighting. No game environment.

Unknown; identity/date unconfirmed.

Quality/crop: 157x220, visibly soft/noisy; unsuitable for enlargement.

Privacy/rights: Identifiable real face; no publication consent supplied.

Decision: Exclude; original blocked from serving/build/Git. Do not upscale or assign to any member/staff identity.

## Implemented source placement

One new historical context section on `/servers`, after the featured current
Create card and before the existing wider-community note. It uses only the
landscape from `New Icon.png`, outside the current-server catalog/artwork.
The source filename does not refer to the official bitten-C logo; branding files
are unchanged. Current Create details, connection safeguards, workshop illustration
and its honest label remain intact. `/servers/create` has no historical image
substitution; its request for genuine current screenshots remains accurate.

Heading: **A glimpse of our server history.**

Caption: **Historical image supplied by the owner; not the current Create server.
Date, server name and builder are unconfirmed.**

Alt: **Large tree builds and elevated wooden structures in a misty Minecraft
landscape at dusk.**

Responsive JPEG copies under `public/images/historical-minecraft/` are 1600x900
(99,275 bytes) and 800x450 (31,830 bytes), down from the 1920x1080 PNG
(2,454,751 bytes). Only downsampling/JPEG conversion, no recolouring or invented
content. Original aspect ratio retained. `srcset`/`sizes`, explicit dimensions,
16:9 reserved frame, cover crop and lazy/async decoding prevent empty bars and
reserve stable layout space. Site integration does not use or publish real faces.

This is a restrained source-owned server-history figure, not a second Gallery,
new content collection, server listing or replacement homepage slideshow.

## Original-folder privacy protection

The provided `public/images/Server Photos` folder contains a remaining real portrait and
unreviewed art. Keeping it directly servable would conflict with the privacy
requirement, but moving/deleting originals was expressly prohibited.

The narrowly scoped `build-plugins/historical-photo-privacy.ts` solves this for
the supported pipeline: Vite dev/preview returns 404/no-store for the raw folder,
including case/encoding/dot-path and `/@fs/` aliases. Build hooks remove only the
generated copied folder under `build/client/images/Server Photos`, preserving
source files and the optimized public folder. Actual Vite requests to both face
files, raw landscape, double-encoded and filesystem paths return 404. Generated
build contains no raw originals; optimized copies and `/servers`, `/about`,
`/gallery` return 200. The source folder is ignored by Git to avoid accidentally
staging private faces/unreviewed art. Supported dev/build protection does not make
an unrelated static server pointed directly at `public/` safe; do not bypass it.

Vite config adds only this plugin; Node tsconfig includes it and permits its
explicit `.ts` import. No Worker routing, auth, staff permissions, consent logic,
Cloudflare bindings, dependencies or database schema was changed. An existing
generated copy of the raw folder was removed only from build output after its
resolved path was verified inside the client build root. All originals remain.

## Exact Content Studio import and placement plan - not executed

A read-only occupancy check found no non-deleted About Memories/Gallery document
in this local database, while Homepage has an existing published four-item
collection. This is a local snapshot, not permission to overwrite anything;
recheck both private working and current live content at import time. No IDs,
private captions or account data were printed, and no content row was changed.

### Prepare permissions and private library records first

1. Owner confirms which worlds/builds/captures these depict and whether required
   creator/participant/skin/render permissions or attributions exist. Dates in
   filenames alone do not establish chronology. Do not assign Carrott/the Owner
   as captured-by unless confirmed.
2. Staff upload through `/control/media`, never SQL/R2 scripts. Proposed copies:
   - `.wrangler/historical-photo-review/proposed-imports/historical-group-hall.jpg`
     (1439x820, 253,664 bytes; no crop/upscale).
   - `.wrangler/historical-photo-review/proposed-imports/historical-group-woodland.jpg`
     (1440x828, 240,878 bytes; generic 32px title bar removed, no upscaling).
   - Reuse the selected 1600x900 landscape display copy (99,275 bytes) if approved
     for managed About/Gallery use. Keep original PNG for future quality review.
3. Suggested library titles: `Historical Minecraft group - hall`, `Historical
   Minecraft group - woodland`, `Historical Minecraft tree settlement`.
   Tags: `historical, minecraft` plus `group` or `builds` as appropriate.
   Source URL: blank unless a real approved HTTPS source is supplied; do not
   publish local filesystem paths. Captured-by: blank pending identification.
   Internal notes record the original filename, owner-supplied provenance, crop
   disclosure and unconfirmed date/world/creator. Required credit is filled only
   from confirmed requirements, not invented wording.
4. Keep unresolved rights/publication restrictions flagged in the Media Library
   until the owner/curator confirms permission. Reuse one asset per approved image
   across placements. This plan creates no seed/upload/metadata changes itself.

### About Memories - highest-priority historical placement

Use existing `/control/collections/about-memories` and existing slots; do not add
hardcoded fallback images or modify the approved About writing.

| Existing slot | Selected candidate | Image description / review |
| --- | --- | --- |
| `opening` / Community memories | Hall group screenshot | `Minecraft avatars gathered inside a wood-and-stone hall with pale flooring and dark red trim.` The central group survives the existing 3:2 centre crop. Do not claim a member count, event, date or server name. |
| `history` / Shared worlds & moments | Tree settlement | `Large tree builds and elevated wooden structures in a misty Minecraft landscape at dusk.` Review the existing 2:1 centre crop; full image remains available in the existing viewer. |

If a slot already contains saved/live media when staff open it, preserve it and
present the candidate to the owner rather than replacing it. Save Draft, Preview,
then publish only through the normal staff action after permission/placement
review. An already live release remains independent of draft edits. The woodland
group is an alternate opening candidate; it is not a third new About slot.
The crop-proposal sheet is a local visual aid, not an import or published preview.

### Community Gallery - existing curator-controlled collection

At `/control/collections/gallery`, add approved history entries to the existing
working collection; do not replace existing items or create a competing route.
Suggested order: hall group, woodland group, tree settlement. Reuse the approved
Media Library assets above.

| Display title | Description | Alt |
| --- | --- | --- |
| A gathering in an earlier world | Historical Minecraft group image supplied by the owner. World, date and captured-by credit await confirmation. | Minecraft avatars gathered inside a wood-and-stone hall with pale flooring and dark red trim. |
| A woodland gathering | Another historical Minecraft group image; no link to the present Create server is claimed. | Minecraft avatars grouped between stone pillars in a timber-and-foliage interior. |
| A world among the trees | Historical Minecraft landscape supplied by the owner, separate from the present Create server. | Large tree builds and elevated wooden structures in a misty Minecraft landscape at dusk. |

Keep Visible off/collection unpublished while rights are unresolved; leave Featured
unchanged unless the curator requests it. Gallery creator credit comes from
confirmed central library metadata; mandatory third-party credit remains required.
Only after review should staff enable the new entries, Preview and Publish via
V2. No upload, collection draft, publication or persistent image release occurred
in this task. The above wording is a proposed curation plan, not live content.

### Homepage - recommendation only

Preserve all four existing managed items, rotation, captions, CTAs and controls.
The tree settlement is a possible future landscape slide if the owner explicitly
requests it and confirms the crop/caption; it already has a focused historical
placement on Servers, so there is no reason to replace the current slideshow now.
Group shots are stronger About/Gallery material. No homepage media change made.

## Verification and screenshots

- All **168 regression tests** pass, including raw-source alias protection,
  generated-copy-only exclusion and clear historical/current distinction.
- Typecheck, production build, built-route/authentication, Studio V2 Worker/Cron,
  About Memories Worker, Phase 7A and schema-gated Phase 7B Worker suites pass.
- Actual Edge review at 1440, 1024, 760, 390 and 320px: image loads, full-bleed
  16:9 crop, descriptive alt, lazy/async loading, intrinsic/reserved dimensions,
  no upscaling or horizontal overflow, historical caption and unchanged
  About/Gallery/Create pages pass. File-weight reductions were measured; no
  real-device Web Vitals or accessibility certification is implied.
- All eight remaining source hashes unchanged; no exact duplicates. Joel's portrait removed to private backup; the other portrait remains blocked/excluded.
- Persistent migration ledger remains 0013; proposed 0014 is not applied. No
  persistent D1/R2, Media Library or Content Studio changes. No production change.

Matched Servers Hub screenshots (only the Hub changed):

- 1440px: [Before](../.wrangler/historical-photo-review/servers-before-1440.png) / [After](../.wrangler/historical-photo-review/servers-after-1440.png)
- 1024px: [Before](../.wrangler/historical-photo-review/servers-before-1024.png) / [After](../.wrangler/historical-photo-review/servers-after-1024.png)
- 760px: [Before](../.wrangler/historical-photo-review/servers-before-760.png) / [After](../.wrangler/historical-photo-review/servers-after-760.png)
- 390px: [Before](../.wrangler/historical-photo-review/servers-before-390.png) / [After](../.wrangler/historical-photo-review/servers-after-390.png)
- 320px: [Before](../.wrangler/historical-photo-review/servers-before-320.png) / [After](../.wrangler/historical-photo-review/servers-after-320.png)

About/Gallery/Homepage are import recommendations, so there are no fabricated
before/after screenshots suggesting those managed pages were published. Private
crop/contact sheets show candidates instead. Browser scripts and measured results
are under `.wrangler/historical-photo-review/`; none are website assets.

Remaining owner/staff review: world/date/builder/captured-by identification;
participant/art/template permissions; crop/readability on physical devices;
actual Studio upload/draft/preview/publish using approved role sessions. Real
portraits and the animated/template material remain excluded pending their own
identification/permission decisions. Staff permissions/consent/schema are unchanged.

## Files for this task

```text
website/app/routes/servers.tsx
website/app/servers.css
website/public/images/historical-minecraft/historical-tree-settlement-800.jpg
website/public/images/historical-minecraft/historical-tree-settlement-1600.jpg
website/build-plugins/historical-photo-privacy.ts
website/vite.config.ts
website/tsconfig.node.json
website/.gitignore
website/tests/historical-photo-privacy.test.mjs
website/tests/servers.test.mjs
website/docs/historical-server-photo-review.md
website/docs/historical-server-photo-inventory.json
website/docs/historical-server-photo-assets.json
website/docs/project-status.md
```

Everything remains uncommitted and unstaged. Preserve `AGENTS.md.backup`, prior
untracked audit/art concepts and all Phase 7A/7B work. No push, merge, deployment,
remote migration or change to the separate teaser site.

## Owner-confirmed portrait exclusion

The owner identified the first filename-labelled thumbnail as Joel:
`IMG_0505.png` (419x403, 133,092 bytes). It is no longer in the repository's
image collection. The original was moved, not permanently deleted, to a private
backup outside the repository and verified against its original SHA-256.
Its standalone review JPEG and the previous contact sheet containing its image
were also moved outside the repository. The refreshed contact sheet and active
inventory exclude it. No unrelated original was altered or relocated.

[Exclusion manifest](historical-server-photo-exclusions.json) records the filename
and content hash, so future review generation excludes it even if it is accidentally
reintroduced or renamed. Regenerate sheets using
`scripts/review-historical-photos.ps1`, which applies that manifest. The record is
an exclusion tombstone, not an asset source or recommendation. There is no Joel
entry in the public-copy asset manifest, About/Gallery import plan or any page.
No persistent Content Studio/media/database record was inspected or changed.

Verification: raw portrait URLs return 404, the source path is absent, and no
portrait bytes or original folder are included in production output. Page designs,
permissions, media workflows and database schemas are unchanged. No migration,
commit, push or deployment. The private backup path is intentionally not recorded
in source/public documentation.

Removal verification: 2 focused photo-privacy tests and production build pass.
Direct, case-variant, double-encoded and filesystem-alias portrait URLs return
404. Attempting to access the external private backup through Vite's filesystem
endpoint returns 403. The source portrait, its standalone review JPEG and former
contact sheet are absent from project image paths; all eight remaining originals
match their inventory hashes. No application source or page design changed for
this removal. The new contact-sheet generator was executed successfully with
eight eligible images and excludes both the filename and content hash on future
runs, including renamed reintroductions.
