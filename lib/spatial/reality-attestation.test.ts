import { describe, expect, it } from "vitest";
import { attestReality } from "./reality-attestation";

describe("Reality Attestation", () => {
  it("does not allow immersive readiness without consent", () => {
    const result = attestReality({
      published: true,
      datasetVersioned: true,
      provenanceVerified: true,
      integrityVerified: true,
      routeGraphVerified: true,
      accessibilityVerified: true,
      deviceCompatible: true,
      consentGranted: false
    });

    expect(result.level).toBe("route-ready");
  });

  it("requires integrity for map readiness", () => {
    const result = attestReality({
      published: true,
      datasetVersioned: true,
      provenanceVerified: true,
      integrityVerified: false,
      routeGraphVerified: false,
      accessibilityVerified: false,
      deviceCompatible: false,
      consentGranted: false
    });

    expect(result.level).toBe("untrusted");
  });
});
