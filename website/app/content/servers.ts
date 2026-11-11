/** Owner-approved public catalog only. Never put connection or onboarding secrets here. */
export type ServerImage = {
  src: string;
  alt: string;
  caption: string;
  kind: 'illustration' | 'screenshot';
  requiredCredit?: string;
};
export type ServerDefinition = {
  id: string;
  slug: string;
  game: string;
  name: string;
  description: string;
  image?: ServerImage;
  visibility: 'public' | 'hidden';
  ownerApproved: boolean;
  availability: 'private-access' | 'details-only';
  featured: boolean;
};
export type PublicServer = Pick<ServerDefinition, 'id' | 'slug' | 'game' | 'name' | 'description' | 'availability' | 'featured' | 'image'> & {detailsHref: string};

const catalog: readonly ServerDefinition[] = [{
  id: 'carrott-create', slug: 'create', game: 'Minecraft Java',
  name: "Carrott's Create Server",
  description: 'A modded Minecraft world for creative engineering. Think Create machinery, automation, ambitious railway ideas, and builds that are better with friends.',
  visibility: 'public', ownerApproved: true, availability: 'private-access', featured: true,
  image: {
    src: '/images/create-workshop-placeholder.svg',
    alt: 'Illustrated mechanical workshop with interlocking gears and warm windows; not a server screenshot',
    caption: 'Workshop illustration - not a community screenshot.', kind: 'illustration',
  },
}];

/** Only repository artwork or existing guarded public detail derivatives are eligible. */
export function isServerImage(image: ServerImage | undefined): image is ServerImage {
  if (!image?.alt.trim() || !image.caption.trim()) return false;
  const uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
  return /^\/images\/[a-z0-9-]+\.(?:svg|png|webp|jpg)$/.test(image.src) ||
    new RegExp(`^/media/(?:studio|releases)/${uuid}/${uuid}/detail$`).test(image.src);
}

/** Explicit public projection; hidden/unapproved entries never become cards or payloads. */
export function publicServers(input: readonly ServerDefinition[] = catalog): readonly PublicServer[] {
  return input.filter(server => server.visibility === 'public' && server.ownerApproved && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(server.slug))
    .map(server => ({id: server.id, slug: server.slug, game: server.game, name: server.name,
      description: server.description, availability: server.availability, featured: server.featured,
      detailsHref: `/servers/${server.slug}`, image: isServerImage(server.image) ? {src: server.image.src, alt: server.image.alt, caption: server.image.caption, kind: server.image.kind, requiredCredit: server.image.requiredCredit} : undefined}))
    .sort((a,b) => Number(b.featured) - Number(a.featured));
}
