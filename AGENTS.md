# CarrottCrunch project rules

- Spell the community name **CarrottCrunch**, always with two t's in Carrott. **TheCarrottCake** is a separate personal identity; do not conflate the brands.
- Preserve the existing React Router, Vite, TypeScript, and Cloudflare Workers configuration. Work in `website/`.
- Use reusable, typed React components and responsive layouts. Support keyboard navigation, visible focus, semantic landmarks, descriptive labels, and reduced motion.
- Keep the design premium, modern, and gaming focused with subtle playful crunch details. Approved Apricot Glow palette: main background `#FFE8D2`, cards/surfaces `#FFF8ED`, primary text `#35251F`, primary action/accent `#B64223`, supporting orange `#F4A453`, featured dark surfaces `#44271F`, text on dark `#FFF5E9`, muted text `#70513F`. Use reusable semantic CSS variables. Keep the public website, Discord login, and member accounts light; preserve Crunch Control?s intentionally dark workspace. Supporting orange is decorative or used on dark surfaces, never low-contrast small text on light surfaces.
- Prefer the existing bitten-C logo. Until a real brand asset is supplied, clearly document the temporary placeholder.
- Do not invent community activity, member counts, testimonials, live statistics, server addresses, or Discord invites. Label illustrative content and unavailable connections honestly.
- Do not introduce live integrations, databases, production changes, or Cloudflare deployments without explicit authorization. The administrator dashboard is future scope; do not imply authentication or administration is implemented.
- Do not commit credentials or secrets. Avoid unnecessary dependencies.
- Run `npm run typecheck` and `npm run build` from `website/` after implementation and fix relevant errors. Never run the deployment script as a validation step.
