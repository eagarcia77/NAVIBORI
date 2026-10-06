import { describe, expect, it } from "vitest";
import { assessSpatialTruth, PILOT_001_TRUTH } from "./truth-ledger";

describe("Spatial Truth Ledger", () => {
  it("keeps Pilot 001 immersive modes blocked while truth is draft", () => {
    const state = assessSpatialTruth(PILOT_001_TRUTH);
    expect(state.immersiveReady).toBe(false);
    expect(state.label).toBe("Draft");
  });

  it("requires published identity, provenance and hash for immersive readiness", () => {
    const state = assessSpatialTruth({
      venueId: "venue-1",
      datasetId: "dataset-9",
      revision: 4,
      status: "published",
      provenance: "validated municipal survey",
      datasetHash: "sha256:abc",
      publishedAt: "2026-10-06T00:00:00Z"
    });
    expect(state.immersiveReady).toBe(true);
  });
});
