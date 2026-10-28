export type StudioKind = 'announcement' | 'event' | 'homepage' | 'banners' | 'gallery' | 'about-memories';
export type StudioItem = {
    id: string;
    assetId: string;
    title: string;
    description: string;
    link: string;
    linkText: string;
    enabled: boolean;
    featured: boolean;
    alt: string;
};
export type StudioSnapshot = {
    title: string;
    body_text: string;
    summary?: string;
    coverId?: string;
    coverAlt?: string;
    starts_at?: number;
    ends_at?: number;
    timezone?: string;
    event_state?: 'active' | 'cancelled';
    location?: string;
    eventInput?: Record<string, string>;
    scheduleInput?: {
        date: string;
        time: string;
        occurrence: string;
    };
    memories?: Partial<Record<'opening' | 'history', {assetId: string; alt: string}>>;
    items?: StudioItem[];
    media?: {
        placement: string;
        assetId: string;
        alt: string;
    }[];
};
export type StudioDocument = {
    id: string;
    kind: StudioKind;
    title: string;
    revision: number;
    version: number;
    status: string;
    live_release_id: string | null;
    pending_release_id: string | null;
    created_at: number;
    updated_at: number;
    deleted_at: number | null;
};
export type StudioImage = {
    assetId: string;
    src: string;
    cardSrc: string;
    width: number;
    height: number;
    alt: string;
    creator: string;
    requiredCredit: string;
    source: string;
};
export const assetIdValid = (id: string) => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id);
