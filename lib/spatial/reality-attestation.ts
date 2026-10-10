export interface RealityAttestationInput {
  published: boolean;
  datasetVersioned: boolean;
  provenanceVerified: boolean;
  integrityVerified: boolean;
  routeGraphVerified: boolean;
  accessibilityVerified: boolean;
  deviceCompatible: boolean;
  consentGranted: boolean;
}

export interface RealityAttestation {
  level: "untrusted" | "map-ready" | "route-ready" | "immersive-ready";
  checks: Array<{ key: string; passed: boolean }>;
}

export function attestReality(input: RealityAttestationInput): RealityAttestation {
  const checks = [
    { key: "published", passed: input.published },
    { key: "dataset", passed: input.datasetVersioned },
    { key: "provenance", passed: input.provenanceVerified },
    { key: "integrity", passed: input.integrityVerified },
    { key: "routeGraph", passed: input.routeGraphVerified },
    { key: "accessibility", passed: input.accessibilityVerified },
    { key: "device", passed: input.deviceCompatible },
    { key: "consent", passed: input.consentGranted }
  ];

  const mapReady =
    input.published &&
    input.datasetVersioned &&
    input.provenanceVerified &&
    input.integrityVerified;

  const routeReady =
    mapReady &&
    input.routeGraphVerified &&
    input.accessibilityVerified;

  const immersiveReady =
    routeReady &&
    input.deviceCompatible &&
    input.consentGranted;

  return {
    level: immersiveReady
      ? "immersive-ready"
      : routeReady
        ? "route-ready"
        : mapReady
          ? "map-ready"
          : "untrusted",
    checks
  };
}
