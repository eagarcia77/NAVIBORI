import { describe, expect, it } from "vitest";
import {
  canonicalizeRealityPackage,
  hashRealityPackage,
  verifyRealityPackageIntegrity
} from "./reality-package";

const manifest = {
  packageVersion: 1 as const,
  venueId: "venue-1",
  datasetId: "dataset-1",
  revision: 7,
  publishedAt: "2026-10-06T00:00:00Z",
  provenance: "validated survey",
  modules: ["map","routing","twin"] as Array<"map" | "routing" | "twin" | "ar" | "vr" | "audio">,
  payload: {
    b: 2,
    a: { y: true, x: "stable" }
  }
};

describe("Reality Package Integrity", () => {
  it("canonicalizes object keys deterministically", () => {
    expect(canonicalizeRealityPackage(manifest)).toContain('"a":{"x":"stable","y":true},"b":2');
  });

  it("creates and verifies SHA-256 package integrity", async () => {
    const hash = await hashRealityPackage(manifest);
    expect(hash.startsWith("sha256:")).toBe(true);
    expect(await verifyRealityPackageIntegrity(manifest, hash)).toBe(true);
  });

  it("detects modified package content", async () => {
    const hash = await hashRealityPackage(manifest);
    const changed = { ...manifest, revision: 8 };
    expect(await verifyRealityPackageIntegrity(changed, hash)).toBe(false);
  });
});
