import { describe, expect, it } from "vitest";
import { getCommerceBySlug, getCommerceSlugs } from "./lookup";

describe("commerce lookup",()=>{
  it("finds a demo business by slug",()=>{
    expect(getCommerceBySlug("sabores-boricuas-demo")?.name).toContain("Sabores");
  });

  it("returns static slugs",()=>{
    expect(getCommerceSlugs()).toContain("borinquen-artesanal-demo");
  });
});
