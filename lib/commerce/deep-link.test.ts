import { describe, expect, it } from "vitest";
import { buildBusinessDeepLink, buildBusinessQrPayload, buildCommerceMapLink } from "./deep-link";

describe("Business deep links",()=>{
  it("builds canonical business link",()=>{
    expect(buildBusinessDeepLink("https://navibori.onrender.com/","cafe-demo"))
      .toBe("https://navibori.onrender.com/comercios/cafe-demo");
  });

  it("builds map links with supported navigation modes",()=>{
    expect(buildCommerceMapLink("cafe-demo","driving"))
      .toBe("/?business=cafe-demo&route=driving");
    expect(buildCommerceMapLink("cafe-demo","walking"))
      .toBe("/?business=cafe-demo&route=walking");
    expect(buildCommerceMapLink("cafe-demo","cycling"))
      .toBe("/?business=cafe-demo&route=cycling");
    expect(buildCommerceMapLink("cafe-demo","scooter"))
      .toBe("/?business=cafe-demo&route=scooter");
    expect(buildCommerceMapLink("cafe-demo"))
      .toBe("/?business=cafe-demo");
  });

  it("builds NAVIBORI QR payload",()=>{
    expect(buildBusinessQrPayload("https://navibori.onrender.com","cafe-demo"))
      .toContain("NAVIBORI|BUSINESS|");
  });
});
