/** Public presentation only: these URLs still go through live-release delivery. */
export type CommunityHeroSlide = {
  id: string;
  image: string;
  width: number;
  height: number;
  title: string;
  text: string;
  alt: string;
  link: string;
  linkText: string;
  credit: string;
  creditSource: string;
};

export const HERO_INTERVAL_MS = 7000;
export const HERO_FADE_MS = 1200;

export function isPublicHeroImage(src: string): boolean {
  const uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
  return new RegExp(`^/media/(?:studio|releases)/${uuid}/${uuid}/detail$`).test(src);
}

export function usableHeroSlides(slides: readonly CommunityHeroSlide[], failed: ReadonlySet<string>) {
  const ids = new Set<string>();
  return slides.filter(slide => {
    if (!slide.id || ids.has(slide.id) || !isPublicHeroImage(slide.image) || failed.has(slide.image)) return false;
    ids.add(slide.id);
    return true;
  });
}

export function adjacentHeroSlide(slides: readonly CommunityHeroSlide[], id: string | undefined, direction: number) {
  if (!slides.length) return null;
  const index = Math.max(0, slides.findIndex(slide => slide.id === id));
  return slides[(index + direction % slides.length + slides.length) % slides.length];
}
