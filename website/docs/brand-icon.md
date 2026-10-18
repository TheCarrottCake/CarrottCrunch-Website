# CarrottCrunch authoritative icon

The source of truth is `public/branding/CarrottCrunch-Icon-Master.svg`, supplied as original Inkscape artwork. It has not been edited. Its SHA-256 is `69a6c0eea5d8c74513787465f19cd43ed0a6b63f8cea07c33bdd845c76cb4c27`.

## Source inspection and optimization

The master uses a `0 0 129.801 175.27485` viewBox and millimeter width/height. Its visible artwork consists of seven paths: one burnt-orange C (`#B64223`), three supporting-orange leaves, and three supporting-orange crumbs (`#F4A453`). All paths are opaque with zero-width strokes. There is no painted background; the white page color is an Inkscape editor setting.

The two outer groups translate by `(-53.693173,-10.901461)` and `(3.4375654,-5.7228164)`. The C retains `scale(-1)`; the crumbs retain rotations of `-8.5837591`, `-52.762718`, and `123.29206` about their original centers. Every rendered `d` value and transform is preserved verbatim in the browser asset. Inkscape live-effect definitions and `original-d` attributes describe editing history; the rendered paths already contain the completed effects.

`public/branding/carrottcrunch-icon.svg` removes editor namespaces, metadata, effect definitions, unused IDs, empty layers, redundant opacity declarations, and zero-width strokes. It retains the group hierarchy, explicit approved fills, seven paths, and every transform. No path rounding, simplification, flattening, tracing, or image generation was used. The file shrank from 12,607 to 4,345 bytes (about 66%).

Inkscape measured drawing bounds of approximately `(2.5, 3.3757, 124.801, 168.5234)` in master viewBox units. The exported viewBox is `-3.5 -2.625 136.801 180.52485`, giving approximately six units of transparent padding on each side. `preserveAspectRatio="xMidYMid meet"` and CSS `object-fit: contain` preserve proportions inside square or rectangular placements.

## Website usage

The shared typed `CrunchMark` component loads the browser asset as a decorative image. The surrounding home link retains its accessible name. Public navigation, footer, staff navigation, access shells, and decorative feature/showcase marks all use the same asset. Logo CSS now targets `.crunch-mark`; feature decoration was moved inside its card to keep the complete mark visible. The favicon link also points directly to this asset. The earlier generated `public/favicon.svg` is no longer referenced by the website.

## Verification

- Regression tests compare all seven paths, their transform ancestry, and their colors against the master, and verify transparent/padded SVG structure.
- Headless Microsoft Edge rendered the master and optimized asset with the same padded viewBox at 548 × 723 pixels. Pixel comparison found **zero differences**, both with transparency and composited on cream `#FFF8ED` and brown `#44271F`.
- Transparent corners and painted bounds `(23, 24)` through `(523, 698)` confirmed padding on all sides, with no clipping.
- Browser screenshots at desktop (1100px) and mobile (390px) tested 16, 32, 37, 64, 128, and 274px icon boxes on both backgrounds. All images decoded; neither fixture had horizontal overflow. Visual review confirmed the complete C, three leaves, and three crumbs, with preserved proportions.
- Independent Inkscape PNG exports were visually inspected on both backgrounds.
- Current React components and production CSS were also rendered as explicitly illustrative account/header/footer and staff-dashboard fixtures at 1440px and 390px. The shared logo displayed correctly in light navigation and the brown staff sidebar; neither layout had horizontal overflow. These were static presentation fixtures, without live sign-in.
- `npm test`: 49 passed, 0 failed. `npm run typecheck` and `npm run build`: passed. `git diff --check`: passed.

Local review scripts, PNGs, and browser measurements are ignored artifacts under `.wrangler/logo-review/`. Only copies were used for adjusted render comparisons. No authentication, database, or content operations were changed.
