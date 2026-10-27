/** Public-safe presentation. Storage keys, consent evidence and staff identities never belong here. */
export type FeaturedImage = {
 requiredCredit?:string; id: string; assetId: string; alt: string; creator: string; anonymous: boolean; source: string;
 width: number; height: number; cardWidth: number; cardHeight: number;
 src: string; cardSrc: string; available: boolean;
};
export function validFeaturedId(value: string) { return value === '' || /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value); }
