import { describe, expect, it } from "vitest";
import { buildSpatialEnergyState } from "./spatial-energy";

describe("Spatial Energy State", () => {
  it("keeps predictive channels separate from factual channels", () => {
    const state = buildSpatialEnergyState({
      publishedEvent: true,
      publishedAccessibility: false,
      publishedCulture: true,
      publishedOperations: false,
      approvedPrediction: true
    });

    expect(state.activeCount).toBe(3);
    expect(state.factualCount).toBe(2);
    expect(state.predictiveCount).toBe(1);
  });

  it("reports no active energy channels when nothing is published", () => {
    const state = buildSpatialEnergyState({
      publishedEvent: false,
      publishedAccessibility: false,
      publishedCulture: false,
      publishedOperations: false,
      approvedPrediction: false
    });

    expect(state.activeCount).toBe(0);
  });
});
