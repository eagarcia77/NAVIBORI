import { describe, expect, it } from "vitest";
import { polygonFeatureToExtrusion } from "./extrusion";

describe("polygonFeatureToExtrusion", () => {
  it("creates a 3D extrusion descriptor from a polygon feature", () => {
    const descriptor = polygonFeatureToExtrusion({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[0,0],[4,0],[4,3],[0,3],[0,0]]]
      },
      properties: {
        id: "space-1",
        name: "Espacio validado",
        heightMeters: 3.5
      }
    }, "fallback");

    expect(descriptor?.id).toBe("space-1");
    expect(descriptor?.heightMeters).toBe(3.5);
    expect(descriptor?.footprint).toHaveLength(5);
  });

  it("uses safe defaults for invalid optional height", () => {
    const descriptor = polygonFeatureToExtrusion({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]]
      },
      properties: { heightMeters: -2 }
    }, "fallback");

    expect(descriptor?.heightMeters).toBe(3);
  });

  it("rejects malformed polygons", () => {
    const descriptor = polygonFeatureToExtrusion({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0,0],[1,0]]] },
      properties: {}
    }, "fallback");

    expect(descriptor).toBeNull();
  });
});
