import {describe, it, expect} from "vitest";
import {resolveAppOrigin} from "./app-origin";

describe("deployment-owned authentication origin", () => {
  it("supports Netlify and custom domains without accepting a request host", () => {
    expect(resolveAppOrigin("https://navibori-test.netlify.app/", "production", true)).toBe("https://navibori-test.netlify.app");
    expect(resolveAppOrigin("https://app.example.com", "production")).toBe("https://app.example.com");
  });
  it("preserves Render but requires explicit configuration on Netlify", () => {
    expect(resolveAppOrigin(undefined, "production")).toBe("https://navibori.onrender.com");
    expect(() => resolveAppOrigin(undefined, "production", true)).toThrow("NEXT_PUBLIC_APP_URL");
  });
  it("rejects insecure or malformed production destinations", () => {
    for (const value of ["//evil.test", "invalid", "http://example.com", "http://localhost:3000", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?next=evil", "https://example.com/#fragment", "javascript:alert(1)"]) {
      expect(() => resolveAppOrigin(value, "production")).toThrow();
    }
  });
  it("allows HTTP only for local development", () => {
    expect(resolveAppOrigin("http://localhost:3000", "development")).toBe("http://localhost:3000");
    expect(() => resolveAppOrigin("http://example.com", "development")).toThrow();
  });
});
