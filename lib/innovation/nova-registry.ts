export type NovaMaturity = "ready" | "pilot" | "experimental" | "research";

export interface NovaModule {
  id: string;
  name: string;
  maturity: NovaMaturity;
  description: string;
  requiresVerifiedSpatialData: boolean;
  privacySensitive: boolean;
}

export const novaModules: NovaModule[] = [
  { id: "spatial-memory", name: "Spatial Memory Graph", maturity: "ready", description: "Temporal provenance graph for spaces, assets, observations and revisions.", requiresVerifiedSpatialData: false, privacySensitive: false },
  { id: "temporal-twin", name: "Temporal Twin", maturity: "pilot", description: "Replay and compare validated venue states across time.", requiresVerifiedSpatialData: true, privacySensitive: false },
  { id: "ghost-trails", name: "Ghost Trails", maturity: "experimental", description: "Privacy-preserving aggregate movement-flow visualization.", requiresVerifiedSpatialData: true, privacySensitive: true },
  { id: "flow-field", name: "Predictive Flow Field", maturity: "research", description: "Clearly labeled simulation of likely congestion and visitor movement.", requiresVerifiedSpatialData: true, privacySensitive: true },
  { id: "holo-coqui", name: "Holo-Coquí", maturity: "pilot", description: "Spatial guide that can trigger map, audio and AR actions.", requiresVerifiedSpatialData: true, privacySensitive: false },
  { id: "portal-mode", name: "Portal Mode", maturity: "pilot", description: "Transition from map cards into immersive remote venue scenes.", requiresVerifiedSpatialData: false, privacySensitive: false },
  { id: "semantic-twin", name: "Semantic Twin", maturity: "ready", description: "Machine-readable meaning layered onto canonical geometry.", requiresVerifiedSpatialData: false, privacySensitive: false },
  { id: "adaptive-access", name: "Adaptive Accessibility", maturity: "pilot", description: "User-selected route preferences such as step-free, lower sensory load and rest stops.", requiresVerifiedSpatialData: true, privacySensitive: true },
  { id: "quest-engine", name: "Spatial Quest Engine", maturity: "ready", description: "Cultural and educational missions grounded in verified POIs.", requiresVerifiedSpatialData: true, privacySensitive: false },
  { id: "spatial-passport", name: "Puerto Rico Spatial Passport", maturity: "ready", description: "Voluntary cross-venue stamps and rewards without persistent precise tracking.", requiresVerifiedSpatialData: false, privacySensitive: true },
  { id: "event-layer", name: "Mixed-Reality Event Layer", maturity: "ready", description: "Time-bounded temporary geometry, experiences and overlays.", requiresVerifiedSpatialData: false, privacySensitive: false },
  { id: "spatial-presence", name: "Spatial Presence", maturity: "experimental", description: "Opt-in shared destination, meeting point and session progress.", requiresVerifiedSpatialData: true, privacySensitive: true },
  { id: "webgpu-compute", name: "WebGPU Spatial Compute", maturity: "experimental", description: "Accelerated flow fields, particles and heavy digital-twin workloads.", requiresVerifiedSpatialData: false, privacySensitive: false },
  { id: "depth-ar", name: "Depth-Aware AR", maturity: "experimental", description: "Depth, hit testing and anchors when supported, with QR/manual fallback.", requiresVerifiedSpatialData: true, privacySensitive: false },
  { id: "spatial-audio", name: "Spatial Audio Wayfinding", maturity: "pilot", description: "Directional audio cues paired with visual and textual navigation.", requiresVerifiedSpatialData: true, privacySensitive: false },
  { id: "venue-autopilot", name: "Venue Autopilot", maturity: "research", description: "Human-approved operational suggestions from spatial intelligence.", requiresVerifiedSpatialData: true, privacySensitive: true }
];
