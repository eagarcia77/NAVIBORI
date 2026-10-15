import {describe,it,expect} from "vitest";
import {NAVIBORI_AUTH_CALLBACK_URL,normalizeConfirmationEmail} from "./email-confirmation";

describe("NAVIBORI email confirmation links",()=>{
  it("uses the production HTTPS origin for verification",()=>{
    expect(NAVIBORI_AUTH_CALLBACK_URL).toBe("https://navibori.onrender.com/auth/callback");
  });
  it("accepts a valid email and normalizes whitespace/case",()=>{
    expect(normalizeConfirmationEmail("  COMMERCIAL@EXAMPLE.COM  ")).toBe("commercial@example.com");
  });
  it("rejects blank, invalid, oversized or non-string input",()=>{
    expect(normalizeConfirmationEmail(null)).toBe(null);
    expect(normalizeConfirmationEmail("not-an-email")).toBe(null);
    expect(normalizeConfirmationEmail("test@domain")).toBe(null);
    expect(normalizeConfirmationEmail("a".repeat(250)+"@example.com")).toBe(null);
  });
});
