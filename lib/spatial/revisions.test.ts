import { describe, expect, it } from "vitest";
import { canPublishRevision, transitionRevision, type SpatialRevision } from "./revisions";

const base: SpatialRevision = {
  id: "rev-1",
  venueId: "venue-1",
  entityId: "poi-1",
  entityType: "poi",
  revisionNumber: 1,
  status: "draft",
  sourceLabel: "Plano municipal validado",
  createdBy: "editor-1",
  createdAt: "2026-10-05T00:00:00Z"
};

describe("spatial revision workflow", () => {
  it("moves draft to review", () => {
    const result = transitionRevision(base, "in_review", "editor-1", "2026-10-05T01:00:00Z");
    expect(result.allowed).toBe(true);
    expect(result.next?.status).toBe("in_review");
  });

  it("records reviewer approval", () => {
    const review = { ...base, status: "in_review" as const };
    const result = transitionRevision(review, "approved", "reviewer-1", "2026-10-05T02:00:00Z");
    expect(result.next?.reviewedBy).toBe("reviewer-1");
    expect(result.next?.reviewedAt).toBe("2026-10-05T02:00:00Z");
  });

  it("blocks publishing without prior approval metadata", () => {
    const approvedWithoutReview = { ...base, status: "approved" as const };
    const result = transitionRevision(approvedWithoutReview, "published", "publisher-1", "2026-10-05T03:00:00Z");
    expect(result.allowed).toBe(false);
    expect(canPublishRevision(approvedWithoutReview)).toBe(false);
  });

  it("publishes only after recorded approval", () => {
    const approved = {
      ...base,
      status: "approved" as const,
      reviewedBy: "reviewer-1",
      reviewedAt: "2026-10-05T02:00:00Z"
    };
    const result = transitionRevision(approved, "published", "publisher-1", "2026-10-05T03:00:00Z");
    expect(result.allowed).toBe(true);
    expect(result.next?.publishedBy).toBe("publisher-1");
    expect(canPublishRevision(approved)).toBe(true);
  });

  it("blocks revisions with missing provenance", () => {
    const invalid = { ...base, sourceLabel: "" };
    const result = transitionRevision(invalid, "in_review", "editor-1", "2026-10-05T01:00:00Z");
    expect(result.allowed).toBe(false);
  });
});
