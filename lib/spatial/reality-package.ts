export interface RealityPackageManifest {
  packageVersion: 1;
  venueId: string;
  datasetId: string;
  revision: number;
  publishedAt: string;
  provenance: string;
  modules: Array<"map" | "routing" | "twin" | "ar" | "vr" | "audio">;
  payload: unknown;
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stableNormalize(item)]);
    return Object.fromEntries(entries);
  }

  return value;
}

export function canonicalizeRealityPackage(manifest: RealityPackageManifest): string {
  return JSON.stringify(stableNormalize(manifest));
}

export async function hashRealityPackage(
  manifest: RealityPackageManifest
): Promise<string> {
  const canonical = canonicalizeRealityPackage(manifest);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return "sha256:" + hex;
}

export async function verifyRealityPackageIntegrity(
  manifest: RealityPackageManifest,
  expectedHash: string
): Promise<boolean> {
  return (await hashRealityPackage(manifest)) === expectedHash;
}
