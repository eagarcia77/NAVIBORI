export interface SpatialMemoryEvent {
  id: string;
  entityId: string;
  revision: number;
  occurredAt: string;
  kind: "created" | "updated" | "moved" | "closed" | "reopened" | "published";
  summary: string;
  provenance: string;
}

export interface SpatialMemoryTimeline {
  entityId: string;
  events: SpatialMemoryEvent[];
}

export function buildSpatialMemoryTimeline(
  entityId: string,
  events: SpatialMemoryEvent[]
): SpatialMemoryTimeline {
  return {
    entityId,
    events: [...events]
      .filter((event) => event.entityId === entityId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  };
}

export function latestSpatialMemoryEvent(
  timeline: SpatialMemoryTimeline
): SpatialMemoryEvent | null {
  return timeline.events.at(-1) ?? null;
}
