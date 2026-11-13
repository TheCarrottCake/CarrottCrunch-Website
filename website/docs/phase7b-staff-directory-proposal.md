# Phase 7B proposal - opt-in Public Staff Directory

> Historical planning record. The owner supplied the approved functional specification; [the proposed implementation and exact migration review](phase7b-public-staff-directory.md) now supersede this scope proposal. Persistent migration 0014 remains unapplied pending approval.

November 11, 2026. Public Staff Directory is confirmed for V1.0. This document
proposes the separate implementation scope; no public profiles are implemented
by Phase 7A and no profile schema or migration is applied.

## Proposed public contract

Publish only the exact owner-approved display name and role, with optional
biography and approved avatar. Require explicit opt-in and field-specific
consent, with an approved version/snapshot of what the person agreed to publish.
Default is unpublished. No inference of consent from sign-in, role assignment,
Discord membership or availability of an avatar on a CDN.

Never expose Discord IDs, account/session records, private notes, administrative
history, reports or consent evidence. Keep consent evidence server-side and
separate from the public projection. Do not make the private roster a public
endpoint. Use a public profile identifier unrelated to private account IDs.

## Decisions for owner approval

- Directory route/location and intended public role labels.
- Who authors/edits profiles; whether staff can submit their own biography.
- Who verifies consent and publishes profiles; publication is separate from
  granting staff access. Do not reintroduce an approval queue into Content Studio.
- Exact consent/withdrawal process, evidence retention and what happens to a
  published profile when staff are deactivated, renamed or change roles.
- Whether to suppress publication immediately on deactivation (recommended),
  and how to require renewed consent for changed names, roles, biographies/photos.
- Avatar source and rights: do not assume permission to republish Discord avatars.
  Reuse guarded Media Library delivery only after its authorization model is
  explicitly extended/tested for profile references; never expose originals.

## Suggested implementation and privacy gates

Design the private authoring workflow and explicit public projection before
schema work. Prepare exact additive migration/backup/rollback implications for
review if new profile/consent tables are needed. No private account table should
be serialized into public data. Preserve real account identities privately for
audit while publishing only consented presentation fields.

Test anonymous/member/staff permissions, field-level consent, draft isolation,
publication, withdrawal, role/deactivation changes, concurrent edits, accessible
empty states and image authorization/revocation. No fabricated staff profiles.
Staff Voices remains independent: a consented quote is not consent for a
public profile, and directory opt-in is not permission to invent a quote.

Final shared visual styling waits for the coordinated public-site design pass;
implement only the functionality and clear reviewable layouts approved for 7B.
No Phase 7B code, database objects or public entries are part of Phase 7A.
