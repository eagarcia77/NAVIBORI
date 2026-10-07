import { describe, expect, it } from "vitest";
import { slugifyBusinessName } from "./slug";

describe("commerce slug",()=>{
  it("normalizes accents and spaces",()=>{
    expect(slugifyBusinessName("Café Boricua PR")).toBe("cafe-boricua-pr");
  });
});
