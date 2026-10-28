export type XenoReadiness =
  | "web-now"
  | "native-bridge"
  | "hardware-pilot"
  | "research"
  | "speculative";

export interface XenoConcept {
  id: string;
  name: string;
  readiness: XenoReadiness;
  terrestrialBasis: string[];
  description: string;
  privacyClass: "low" | "moderate" | "high";
  requiresVerifiedSpatialData: boolean;
}

export const xenoConcepts: XenoConcept[] = [
  {
    id: "neural-reality-mesh",
    name: "Neural Reality Mesh",
    readiness: "web-now",
    terrestrialBasis: ["WebNN", "WebGPU", "Web Workers"],
    description: "On-device spatial inference layer that classifies context and selects rendering/interaction modes without sending raw sensor streams to the cloud.",
    privacyClass: "moderate",
    requiresVerifiedSpatialData: false
  },
  {
    id: "quantum-inspired-routing",
    name: "Quantum-Inspired Route Synthesizer",
    readiness: "web-now",
    terrestrialBasis: ["multi-objective optimization", "graph search", "WebGPU compute"],
    description: "Classical optimizer inspired by quantum search concepts for balancing distance, accessibility, congestion, time and preferences. No quantum computer required.",
    privacyClass: "low",
    requiresVerifiedSpatialData: true
  },
  {
    id: "uwb-anchor-mesh",
    name: "UWB Anchor Mesh",
    readiness: "native-bridge",
    terrestrialBasis: ["Ultra Wideband", "Nearby Interaction", "Android UWB", "visual-inertial fusion"],
    description: "High-precision indoor ranging mesh that can complement QR anchors where supported hardware and native bridges exist.",
    privacyClass: "high",
    requiresVerifiedSpatialData: true
  },
  {
    id: "photonic-portal",
    name: "Photonic Portal",
    readiness: "hardware-pilot",
    terrestrialBasis: ["Gaussian splatting", "WebGPU", "WebXR", "360 capture"],
    description: "Photoreal portal into another venue/state while canonical navigation remains graph-based and authoritative.",
    privacyClass: "moderate",
    requiresVerifiedSpatialData: false
  },
  {
    id: "reality-compiler",
    name: "Reality Compiler",
    readiness: "web-now",
    terrestrialBasis: ["typed scene graph", "capability detection", "accessibility preferences"],
    description: "Compiles one canonical place definition into 2D, 3D, AR, VR, audio-only and reduced-motion experiences.",
    privacyClass: "low",
    requiresVerifiedSpatialData: true
  },
  {
    id: "spatial-zkp",
    name: "Zero-Knowledge Spatial Proofs",
    readiness: "research",
    terrestrialBasis: ["signed credentials", "selective disclosure", "zero-knowledge proofs"],
    description: "Research path for proving visit/quest completion without revealing an entire travel history.",
    privacyClass: "high",
    requiresVerifiedSpatialData: false
  },
  {
    id: "rf-ghost-vision",
    name: "RF Ghost Vision",
    readiness: "research",
    terrestrialBasis: ["mmWave radar", "RF sensing", "edge inference"],
    description: "Research-only aggregate occupancy sensing without cameras. Requires dedicated hardware, strong privacy controls and validation.",
    privacyClass: "high",
    requiresVerifiedSpatialData: true
  },
  {
    id: "lightfield-ready",
    name: "Lightfield / Holographic Display Adapter",
    readiness: "speculative",
    terrestrialBasis: ["multi-view rendering", "light-field displays", "volumetric display research"],
    description: "Renderer abstraction so NAVIBORI scenes could target future glasses-free 3D or holographic displays without changing canonical spatial data.",
    privacyClass: "low",
    requiresVerifiedSpatialData: true
  },
  {
    id: "ambient-swarm",
    name: "Ambient Spatial Agent Swarm",
    readiness: "research",
    terrestrialBasis: ["multi-agent orchestration", "typed command bus", "edge AI"],
    description: "Multiple specialized agents collaborate on routing, culture, commerce and accessibility, but all actions pass through the Reality Firewall.",
    privacyClass: "moderate",
    requiresVerifiedSpatialData: true
  },
  {
    id: "causality-simulator",
    name: "Venue Causality Simulator",
    readiness: "research",
    terrestrialBasis: ["digital twin", "discrete-event simulation", "historical aggregate data"],
    description: "Test what-if scenarios such as closures, event layouts and visitor flow before making real-world changes.",
    privacyClass: "moderate",
    requiresVerifiedSpatialData: true
  }
];
