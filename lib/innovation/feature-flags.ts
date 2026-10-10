export type NovaFlagId =
  | "semantic_twin"
  | "temporal_twin"
  | "holo_coqui"
  | "portal_mode"
  | "spatial_quests"
  | "spatial_passport"
  | "spatial_audio"
  | "ghost_trails"
  | "predictive_flow"
  | "shared_presence"
  | "webgpu_compute"
  | "depth_aware_ar"
  | "gaussian_splats";

export interface NovaFeatureFlag {
  id: NovaFlagId;
  enabledByDefault: boolean;
  requiresVerifiedSpatialData: boolean;
  requiresExplicitPermission: boolean;
  experimental: boolean;
}

export const novaFeatureFlags: NovaFeatureFlag[] = [
  { id: "semantic_twin", enabledByDefault: true, requiresVerifiedSpatialData: false, requiresExplicitPermission: false, experimental: false },
  { id: "temporal_twin", enabledByDefault: true, requiresVerifiedSpatialData: true, requiresExplicitPermission: false, experimental: false },
  { id: "holo_coqui", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: true, experimental: true },
  { id: "portal_mode", enabledByDefault: false, requiresVerifiedSpatialData: false, requiresExplicitPermission: false, experimental: true },
  { id: "spatial_quests", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: false, experimental: true },
  { id: "spatial_passport", enabledByDefault: false, requiresVerifiedSpatialData: false, requiresExplicitPermission: true, experimental: true },
  { id: "spatial_audio", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: true, experimental: true },
  { id: "ghost_trails", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: true, experimental: true },
  { id: "predictive_flow", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: false, experimental: true },
  { id: "shared_presence", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: true, experimental: true },
  { id: "webgpu_compute", enabledByDefault: false, requiresVerifiedSpatialData: false, requiresExplicitPermission: false, experimental: true },
  { id: "depth_aware_ar", enabledByDefault: false, requiresVerifiedSpatialData: true, requiresExplicitPermission: true, experimental: true },
  { id: "gaussian_splats", enabledByDefault: false, requiresVerifiedSpatialData: false, requiresExplicitPermission: false, experimental: true }
];

export function getNovaFlag(id: NovaFlagId) {
  return novaFeatureFlags.find((flag) => flag.id === id);
}
