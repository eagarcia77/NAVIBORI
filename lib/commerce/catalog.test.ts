import { describe, expect, it } from "vitest";
import { filterCommerce } from "./catalog";
import type { CommerceProfile } from "./types";

const demo: CommerceProfile[] = [
  {
    id: "1",
    name: "Café Demo",
    slug: "cafe-demo",
    category: "gastronomia",
    description: "Café y repostería",
    locationLabel: "Local demo A",
    verifiedLocation: false,
    hours: [],
    offers: [{ id: "o1", title: "Café", price: 3, currency: "USD", featured: true, available: true }],
    promotions: [{ id: "p1", title: "Promo", description: "Demo", active: true }],
    tags: ["cafe"],
    verification: "unverified",
    demo: true
  },
  {
    id: "2",
    name: "Artesanía Demo",
    slug: "artesania-demo",
    category: "artesania",
    description: "Artesanía puertorriqueña",
    locationLabel: "Local demo B",
    verifiedLocation: false,
    hours: [],
    offers: [],
    promotions: [],
    tags: ["artesania"],
    verification: "unverified",
    demo: true
  }
];

describe("Commerce catalog", () => {
  it("filters by category", () => {
    expect(filterCommerce(demo,{category:"gastronomia"})).toHaveLength(1);
  });

  it("searches offers and tags", () => {
    expect(filterCommerce(demo,{query:"cafe"})).toHaveLength(1);
  });

  it("filters businesses with active promotions", () => {
    expect(filterCommerce(demo,{promotionsOnly:true})).toHaveLength(1);
  });
});
