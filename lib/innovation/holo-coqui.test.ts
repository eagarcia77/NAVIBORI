import { describe, expect, it } from "vitest";
import { resolveHoloCoquiState } from "./holo-coqui";

describe("Holo-Coquí state", () => {
  it("blocks route guidance without verified routing data", () => {
    expect(resolveHoloCoquiState("route", {
      verifiedSpatialData: false,
      routeAvailable: false,
      immersiveCapable: true,
      explicitXrConsent: true,
      portalPublished: false
    })).toBe("blocked");
  });

  it("allows explain mode without XR", () => {
    expect(resolveHoloCoquiState("explain", {
      verifiedSpatialData: false,
      routeAvailable: false,
      immersiveCapable: false,
      explicitXrConsent: false,
      portalPublished: false
    })).toBe("explain");
  });
});
