import { describe, expect, it } from "vitest";
import { compileReality } from "./reality-compiler";

describe("Reality Compiler", () => {
  it("selects immersive AR only with verified data and consent", () => {
    const result = compileReality({
      verifiedSpatialData: true,
      webXr: true,
      immersiveAr: true,
      immersiveVr: false,
      webGpu: true,
      reducedMotion: false,
      audioAvailable: true,
      explicitXrConsent: true
    });
    expect(result.primary).toBe("immersive-ar");
  });

  it("falls back when verified spatial data is unavailable", () => {
    const result = compileReality({
      verifiedSpatialData: false,
      webXr: true,
      immersiveAr: true,
      immersiveVr: true,
      webGpu: true,
      reducedMotion: false,
      audioAvailable: true,
      explicitXrConsent: true
    });
    expect(result.primary).toBe("twin-3d");
    expect(result.blockedReasons.length).toBeGreaterThan(0);
  });

  it("prioritizes reduced-motion mode when requested", () => {
    const result = compileReality({
      verifiedSpatialData: true,
      webXr: true,
      immersiveAr: true,
      immersiveVr: true,
      webGpu: true,
      reducedMotion: true,
      audioAvailable: true,
      explicitXrConsent: true
    });
    expect(result.primary).toBe("reduced-motion");
  });
});
