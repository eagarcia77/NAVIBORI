export type SpatialTruthStatus = "draft" | "verified" | "published";

export interface SpatialTruthLedgerEntry {
  venueId: string;
  datasetId: string | null;
  revision: number | null;
  status: SpatialTruthStatus;
  provenance: string | null;
  datasetHash: string | null;
  publishedAt: string | null;
}

export function assessSpatialTruth(entry: SpatialTruthLedgerEntry) {
  const hasIdentity = Boolean(entry.datasetId && entry.revision !== null);
  const hasProvenance = Boolean(entry.provenance?.trim());
  const hasHash = Boolean(entry.datasetHash?.trim());
  const published = entry.status === "published";

  return {
    hasIdentity,
    hasProvenance,
    hasHash,
    published,
    immersiveReady: published && hasIdentity && hasProvenance && hasHash,
    label:
      entry.status === "draft"
        ? "Draft"
        : entry.status === "verified"
          ? "Verified"
          : "Published"
  };
}

export const PILOT_001_TRUTH: SpatialTruthLedgerEntry = {
  venueId: "pilot-001",
  datasetId: null,
  revision: null,
  status: "draft",
  provenance: null,
  datasetHash: null,
  publishedAt: null
};
