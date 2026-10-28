import { describe, expect, it } from "vitest";
import { resolveRealityAura } from "./reality-aura";

describe("Reality Aura", () => {
  it("prioritizes published operational truth over decorative semantics", () => {
    const aura = resolveRealityAura({
      publishedSemanticTags: ["culture"],
      activeEvent: true,
      accessibilityFeaturesPublished: true,
      operationalNoticePublished: true,
      approvedPredictionAvailable: true
    });
    expect(aura.kind).toBe("operational");
    expect(aura.factual).toBe(true);
  });

  it("marks predictive aura as non-factual", () => {
    const aura = resolveRealityAura({
      publishedSemanticTags: [],
      activeEvent: false,
      accessibilityFeaturesPublished: false,
      operationalNoticePublished: false,
      approvedPredictionAvailable: true
    });
    expect(aura.kind).toBe("predictive");
    expect(aura.factual).toBe(false);
  });
});
