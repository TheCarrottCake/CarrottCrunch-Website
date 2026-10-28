# CarrottCrunch V3 release-candidate readiness

Prepared on 2026-10-27 (America/Toronto) on
`feature/cinematic-redesign-v3`, from the V2 baseline checkpoint `6f81509`.
This checkpoint preserves the completed Phase 1–4 source, tests and handoffs.
It does not change application behaviour or authorize a merge, push or deployment.

## Validation already completed

The final Phase 4 run passed **122/122 regression tests**, typecheck, production
build, built-route checks, isolated Worker/Cron checks and Git diff checks.
Browser QA covered eleven public views at 1440, 1024, 760, 390 and 320px, plus
keyboard navigation, reduced motion, hero fallback/loading, image-viewer focus
and short-screen menu behaviour. See [Phase 4 QA](public-v3-phase4-qa.md) for
methods, evidence and limitations.

Those results are prior validation of the completed source, not a new full test
run during this documentation/Git checkpoint. Checkpoint verification reviews
the complete diff, staged paths, source integrity and exclusion of private or
generated material. Local screenshots and runtime data remain outside Git.

## Confirmed outstanding findings

| Finding | Evidence and remaining decision |
| --- | --- |
| Showcase image softness | Reviewed published images are 831×465/466 and visibly soften when enlarged on desktop. Review genuinely higher-resolution source uploads and approved crops. Increasing a derivative cap alone cannot recover missing detail. |
| Legacy copy needs approval | About's temporary-logo wording is visibly flagged for editorial review. Gallery's empty-state copy also refers to older concept artwork. Obtain approved replacement copy; do not invent community history or staff statements. |
| Image transfer weight | Reviewed PNG derivatives are approximately 716–840kB each. This is a confirmed asset-size observation, not a measured Web Vitals failure. Decide on a separate optimization proposal only after realistic performance measurement. |

No unresolved functional defect was identified within the completed Phase 4
review. That finding does not certify the manual environments listed below.
No image pipeline, authorization, publication workflow or cache-policy changes
are part of this checkpoint.

## Manual checks not yet performed

These are pending checks, not confirmed defects.

- [ ] **Real Discord OAuth:** test sign-in, callback/return redirects, cancellation,
  expired attempts, member/staff account access, sign-out and protected-route
  redirects in the intended environment. Prior authentication checks use mocks.
- [ ] **Official invitation:** follow the configured Join flow and verify its
  unavailable state; check the live Discord widget separately.
- [ ] **Physical mobile devices:** review iOS/Android touch, landscape, text zoom,
  navigation scrolling, hero cropping and the native image dialog.
- [ ] **Screen readers:** check NVDA/VoiceOver/TalkBack landmarks, heading order,
  accessible names, slideshow announcements, reduced motion, dialog containment
  and focus return. Browser accessibility-tree checks do not replace this.
- [ ] **Higher-resolution showcase review:** approve source quality, central crops,
  full-image presentation and required creator/licence credits on real content.
- [ ] **Editorial approval:** resolve About Us/About and other flagged legacy copy;
  review unfinished-content notices without fabricating missing information.
- [ ] **Field performance:** measure LCP, CLS and INP on realistic mobile devices
  and networks with actual fonts, images and guarded media delivery. Production
  Web Vitals and a production Lighthouse score have not been established.
- [ ] **Authorized media scenarios:** manually review permission expiry/revocation,
  missing images and source attribution using approved test content. Existing
  automated media/release protections remain in place.

## Readiness decision

The completed implementation is ready for release-candidate review. Launch
sign-off remains pending the manual and editorial checklist. Any media-pipeline
optimization needs a separate reviewed proposal preserving immutable release
bindings, private originals, permission checks and revocation behaviour.

The Git checkpoint contains legitimate V3 application source, regression tests
and documentation only. Environment files, credentials, private state, database
files, build output and local screenshots are excluded. Unrelated local files
are retained. The separately managed teaser and production resources remain
untouched.
