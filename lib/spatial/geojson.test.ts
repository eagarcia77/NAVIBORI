import { describe, expect, it } from "vitest";
import { validateGeoJson } from "./geojson";

describe("validateGeoJson", () => {
  it("accepts a valid feature collection", () => {
    const result = validateGeoJson({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-66.5, 18.05] },
          properties: { provenance: "verified-source" }
        }
      ]
    });

    expect(result.valid).toBe(true);
    expect(result.featureCount).toBe(1);
  });

  it("rejects non-feature collections", () => {
    const result = validateGeoJson({ type: "Point", coordinates: [0, 0] });
    expect(result.valid).toBe(false);
  });

  it("warns when provenance is missing", () => {
    const result = validateGeoJson({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {}
        }
      ]
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("provenance"))).toBe(true);
  });
});
