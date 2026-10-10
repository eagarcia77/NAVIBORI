export type RevisionStatus = "draft" | "in_review" | "approved" | "published" | "superseded";

export interface SpatialRevision {
  id: string;
  venueId: string;
  entityId: string;
  entityType: string;
  revisionNumber: number;
  status: RevisionStatus;
  sourceLabel: string;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
}

export interface RevisionTransitionResult {
  allowed: boolean;
  next?: SpatialRevision;
  reason?: string;
}

const transitions: Record<RevisionStatus, RevisionStatus[]> = {
  draft: ["in_review"],
  in_review: ["draft", "approved"],
  approved: ["published", "draft"],
  published: ["superseded"],
  superseded: []
};

export function transitionRevision(
  revision: SpatialRevision,
  nextStatus: RevisionStatus,
  actor: string,
  at: string
): RevisionTransitionResult {
  if (!revision.sourceLabel.trim()) {
    return { allowed: false, reason: "La revisión no tiene una fuente/procedencia documentada." };
  }

  if (!transitions[revision.status].includes(nextStatus)) {
    return {
      allowed: false,
      reason: "Transición no permitida: " + revision.status + " → " + nextStatus
    };
  }

  const next: SpatialRevision = {
    ...revision,
    status: nextStatus
  };

  if (nextStatus === "approved") {
    next.reviewedBy = actor;
    next.reviewedAt = at;
  }

  if (nextStatus === "published") {
    if (!revision.reviewedBy || !revision.reviewedAt) {
      return {
        allowed: false,
        reason: "No se puede publicar una revisión que no tenga aprobación registrada."
      };
    }
    next.publishedBy = actor;
    next.publishedAt = at;
  }

  return { allowed: true, next };
}

export function canPublishRevision(revision: SpatialRevision): boolean {
  return revision.status === "approved"
    && Boolean(revision.reviewedBy)
    && Boolean(revision.reviewedAt)
    && Boolean(revision.sourceLabel.trim());
}
