import { describe, expect, it } from "vitest";
import {
  buildSpatialMemoryTimeline,
  latestSpatialMemoryEvent
} from "./spatial-memory";

describe("Spatial Memory", () => {
  it("orders verified events chronologically", () => {
    const timeline = buildSpatialMemoryTimeline("poi-1", [
      {
        id: "b",
        entityId: "poi-1",
        revision: 2,
        occurredAt: "2026-10-02T10:00:00Z",
        kind: "updated",
        summary: "Updated",
        provenance: "verified field review"
      },
      {
        id: "a",
        entityId: "poi-1",
        revision: 1,
        occurredAt: "2026-10-01T10:00:00Z",
        kind: "created",
        summary: "Created",
        provenance: "verified field review"
      }
    ]);

    expect(timeline.events[0].revision).toBe(1);
    expect(latestSpatialMemoryEvent(timeline)?.revision).toBe(2);
  });
});
