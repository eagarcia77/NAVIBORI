import type { CommerceCategory, CommerceProfile } from "./types";

export interface CommerceFilter {
  query?: string;
  category?: CommerceCategory | "all";
  promotionsOnly?: boolean;
}

export function filterCommerce(
  businesses: CommerceProfile[],
  filter: CommerceFilter
): CommerceProfile[] {
  const query = filter.query?.trim().toLowerCase() ?? "";

  return businesses.filter((business) => {
    const categoryMatch =
      !filter.category ||
      filter.category === "all" ||
      business.category === filter.category;

    const promotionMatch =
      !filter.promotionsOnly ||
      business.promotions.some((promotion) => promotion.active);

    const text = [
      business.name,
      business.description,
      business.category,
      ...business.tags,
      ...business.offers.map((offer) => offer.title)
    ].join(" ").toLowerCase();

    const queryMatch = !query || text.includes(query);

    return categoryMatch && promotionMatch && queryMatch;
  });
}

export function activePromotions(business: CommerceProfile) {
  return business.promotions.filter((promotion) => promotion.active);
}

export function featuredOffers(business: CommerceProfile) {
  return business.offers.filter((offer) => offer.featured);
}
