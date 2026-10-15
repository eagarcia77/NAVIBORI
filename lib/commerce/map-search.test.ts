import {describe,expect,it} from "vitest";
import {commerceMatchesSearch,normalizeCommerceSearch} from "./map-search";

const business={
  id:"b1",
  slug:"cafeteria-borinquen",
  name:"Cafetería Borinquen",
  category:"gastronomia",
  locationLabel:"Juana Díaz",
  verifiedLocation:true,
  demo:false,
  mapLocation:{
    latitude:18.05,
    longitude:-66.50,
    address:"Calle Comercio, Juana Díaz, PR",
    verified:true
  }
} as const;

describe("commerce map search",()=>{
  it("normalizes accents and case",()=>{
    expect(normalizeCommerceSearch("  JUANA DÍAZ ")).toBe("juana diaz");
  });

  it("matches business name category and address tokens",()=>{
    expect(commerceMatchesSearch(business as never,"cafeteria")).toBe(true);
    expect(commerceMatchesSearch(business as never,"gastronomia")).toBe(true);
    expect(commerceMatchesSearch(business as never,"comercio juana")).toBe(true);
    expect(commerceMatchesSearch(business as never,"ponce")).toBe(false);
  });
});
