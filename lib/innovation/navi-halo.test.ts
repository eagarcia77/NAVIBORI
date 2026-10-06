import { describe, expect, it } from "vitest";
import { resolveNaviHalo } from "./navi-halo";

describe("Navi Reality Halo", () => {
  it("marks prediction as non-factual", () => {
    const halo = resolveNaviHalo({
      verifiedSpatialData: true,
      predictionActive: true,
      xenoMode: false,
      blocked: false
    });
    expect(halo.state).toBe("predictive");
    expect(halo.factual).toBe(false);
  });

  it("shows draft when spatial truth is incomplete", () => {
    const halo = resolveNaviHalo({
      verifiedSpatialData: false,
      predictionActive: false,
      xenoMode: false,
      blocked: false
    });
    expect(halo.state).toBe("draft");
  });

  it("prioritizes blocked safety/truth state", () => {
    const halo = resolveNaviHalo({
      verifiedSpatialData: true,
      predictionActive: false,
      xenoMode: true,
      blocked: true
    });
    expect(halo.state).toBe("blocked");
  });
});
