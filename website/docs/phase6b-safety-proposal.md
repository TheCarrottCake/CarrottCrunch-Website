# Phase 6B: Community Safety proposal

> Historical proposal: superseded by the owner-approved Phase 6B request and [implemented Safety handoff](public-v3-phase6b.md). The audit below describes the pre-implementation state.

November 10, 2026. Proposal only: no Safety implementation or new policy is approved by this document.

## Existing evidence

The current `/safety` route renders the shared PublicPage component using
`app/content/public-pages.ts`. It provides the official Join Discord link,
warns about unsolicited links/password/token requests, says community policies
are not published here, and accurately states that no dedicated reporting
contact or website reporting form is available. It includes existing emergency
guidance. It has no reporting loader, action or private moderation data.

The approved `/servers/create` page establishes four Minecraft expectations:

- Treat other players with respect.
- No griefing: respect other people's builds.
- Avoid lag-heavy builds and be considerate with automation.
- Keep shared spaces and other players in mind.

Its approved access model is Discord introduction, a request for access,
staff-guided private Tailscale/network access and Minecraft whitelist approval.
Discord membership does not automatically grant server access. Preserve that
model and link to `/servers/create`; disclose no private network details.

No fuller adopted community rulebook, reporting destination, sanctions policy,
appeal procedure or staff service commitment was found in the repository.
This does not establish what policies may exist privately in Discord.
Content Studio staff roles and technical permissions are not evidence of
moderation duties or an operational public transparency system.

## Proposed Public V3 design

Use an editorial light Apricot Glow page with a compact hero, sage accents,
readable cocoa reporting feature, generous text measure and restrained original
geometric decoration. Suggested draft headline: **Good games. Good neighbours.**
Retain shared public navigation, official branding and footer. Use anchored
section links, semantic headings, visible keyboard focus and reduced motion.
Avoid dashboard grids, fake reports and decorative imagery implying incidents.
At narrow widths, stack content and retain comfortable touch targets.

Suggested content order:

1. **Community expectations.** Reuse established respect and consideration
   expectations. Broader Discord conduct wording remains subject to approval.
2. **Minecraft server rules.** Present the four approved expectations above,
   with the existing private-onboarding link. Do not add build limits, technical
   thresholds, versions, penalties or server addresses.
3. **Respect and harassment prevention.** Proposed addition: clear examples
   and scope for harassment, discrimination, threats and unwanted contact.
   Owner must supply or approve exact definitions and applicability before use.
4. **Reporting concerns.** Preserve the honest unavailable-contact statement
   until the owner identifies an approved destination and its access controls.
   No invented email, ticket bot, channel, staff DM instruction or report button.
5. **Staff responsibilities.** Proposed addition: fair handling, conflicts of
   interest, escalation and access limited to appropriate staff. These are
   approval questions, not promises about current procedures.
6. **Privacy and account safety.** Reuse official-link guidance and warnings
   against sharing passwords/tokens. Any additional account-security advice is
   draft guidance requiring editorial approval. Preserve existing OAuth and
   accounts; do not request sensitive evidence through public page content.
7. **Appeals and transparency.** Reserve editorial space only if adopted policy
   supports it. Do not advertise appeals, deadlines, a sanctions ladder,
   guaranteed confidentiality, response times or public case records without
   explicit approved policy and a real process.

## Decisions required before implementation

- Supply the adopted community rules and approve exact harassment wording,
  scope and relationship to Minecraft-specific rules.
- Confirm the reporting destination, who can access reports, emergency handling
  and what reporters should avoid sharing publicly.
- Define staff responsibilities, conflicts/escalation and review authority.
- Confirm whether appeals exist, their eligibility, route and decision maker.
- Approve what moderation explanations may be public without identifying people
  or revealing private reports; supply any actual notices or required wording.

Existing emergency guidance can remain. No new contact, legal obligation,
penalty or response-time commitment is proposed as an established fact.

## Implementation boundaries and acceptance plan

Implementation requires owner review of this proposal first. A subsequent
approved change should be static public content and existing-route presentation:
no database, CMS collection, report form, API, queue, tracking or new dependency.
Never serialize staff reports, identities, evidence, account details or private
moderation records into public HTML, loaders or client assets. Do not infer
access rights from presentation-only dashboard tools. A future private workflow
would need its own authorization and security review.

Review at 1440, 1024, 760, 390 and 320px; check headings, anchors, keyboard focus,
contrast, reduced motion and overflow. Test that approved rules and real links
are accurate and private material is absent. Rerun regression, typecheck, build,
built-route and current Worker/Cron checks. No production changes are included.
