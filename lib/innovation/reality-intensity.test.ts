import { describe, expect, it } from "vitest";
import { resolveRealityIntensity } from "./reality-intensity";

describe("Reality Intensity", () => {
  it("always allows physical mode", () => {
    const result = resolveRealityIntensity("physical", {
      verifiedSpatialData: false,
      semanticDataAvailable: false,
      predictiveModelAvailable: false,
      immersiveCapable: false,
      immersiveConsent: false
    });
    expect(result.allowed).toBe(true);
    expect(result.effective).toBe("physical");
  });

  it("blocks predictive mode without verified data", () => {
    const result = resolveRealityIntensity("predictive", {
      verifiedSpatialData: false,
      semanticDataAvailable: true,
      predictiveModelAvailable: true,
      immersiveCapable: false,
      immersiveConsent: false
    });
    expect(result.allowed).toBe(false);
    expect(result.effective).toBe("semantic");
  });

  it("blocks immersive mode without explicit consent", () => {
    const result = resolveRealityIntensity("immersive", {
      verifiedSpatialData: true,
      semanticDataAvailable: true,
      predictiveModelAvailable: true,
      immersiveCapable: true,
      immersiveConsent: false
    });
    expect(result.allowed).toBe(false);
  });
});
