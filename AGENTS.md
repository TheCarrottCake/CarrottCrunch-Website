# CarrottCrunch project rules

- Spell the community name **CarrottCrunch**, always with two t's in Carrott. **TheCarrottCake** is a separate personal identity; do not conflate the brands.
- Preserve the existing React Router, Vite, TypeScript, and Cloudflare Workers configuration. Work in `website/`.
- Use reusable, typed React components and responsive layouts. Support keyboard navigation, visible focus, semantic landmarks, descriptive labels, and reduced motion.
- Keep the design premium, modern, and gaming focused with subtle playful crunch details. Brand colors: background `#121417`, orange `#F38C3E`, cream `#F6F0E8`.
- Prefer the existing bitten-C logo. Until a real brand asset is supplied, clearly document the temporary placeholder.
- Do not invent community activity, member counts, testimonials, live statistics, server addresses, or Discord invites. Label illustrative content and unavailable connections honestly.
- Do not introduce live integrations, databases, production changes, or Cloudflare deployments without explicit authorization. The administrator dashboard is future scope; do not imply authentication or administration is implemented.
- Do not commit credentials or secrets. Avoid unnecessary dependencies.
- Run `npm run typecheck` and `npm run build` from `website/` after implementation and fix relevant errors. Never run the deployment script as a validation step.
