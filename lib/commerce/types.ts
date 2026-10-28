export type CommerceCategory =
  | "gastronomia"
  | "compras"
  | "servicios"
  | "artesania"
  | "bienestar"
  | "otros";

export interface CommerceHours {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  opens: string | null;
  closes: string | null;
  closed: boolean;
}

export interface CommerceOffer {
  id: string;
  title: string;
  description?: string;
  price?: number;
  currency: "USD";
  featured: boolean;
  available: boolean;
  sku?: string;
}

export interface CommercePromotion {
  id: string;
  title: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
}

export interface CommerceMediaAsset {
  id: string;
  kind: "logo" | "cover" | "gallery";
  url: string;
  altText: string;
  sortOrder: number;
}

export interface CommerceServiceSettings {
  acceptsRequests: boolean;
  acceptsPickup: boolean;
  acceptsReservations: boolean;
  minLeadMinutes: number;
  maxAdvanceDays: number;
  timezone: string;
  slotMinutes: number;
  pickupCapacityPerSlot: number;
  reservationCapacityPerSlot: number;
  instructions?: string;
}

export interface CommerceProfile {
  id: string;
  name: string;
  slug: string;
  category: CommerceCategory;
  description: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  locationLabel: string;
  verifiedLocation: boolean;
  mapLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    verified: boolean;
  };
  hours: CommerceHours[];
  offers: CommerceOffer[];
  promotions: CommercePromotion[];
  tags: string[];
  logo?: CommerceMediaAsset;
  cover?: CommerceMediaAsset;
  gallery?: CommerceMediaAsset[];
  serviceSettings?: CommerceServiceSettings;
  verification: "unverified" | "pending" | "verified";
  demo: boolean;
}
