import { describe, expect, it } from "vitest";
import { buildBusinessDeepLink, buildBusinessQrPayload } from "./deep-link";

describe("Business deep links",()=>{
  it("builds canonical business link",()=>{
    expect(buildBusinessDeepLink("https://navibori.onrender.com/","cafe-demo"))
      .toBe("https://navibori.onrender.com/comercios/cafe-demo");
  });

  it("builds NAVIBORI QR payload",()=>{
    expect(buildBusinessQrPayload("https://navibori.onrender.com","cafe-demo"))
      .toContain("NAVIBORI|BUSINESS|");
  });
});
