export type PortalSourceKind =
  | "panorama-360"
  | "digital-twin"
  | "gaussian-splat";

export type PortalRenderer = "css-panorama" | "three-webgl" | "three-webgpu";

export interface DimensionalPortalDescriptor {
  id: string;
  title: string;
  sourceKind: PortalSourceKind;
  sourceUrl: string;
  published: boolean;
  provenance: string;
  targetEntityId?: string;
}

export interface PortalCapabilityContext {
  webGpu: boolean;
  webGl: boolean;
}

export interface PortalDecision {
  allowed: boolean;
  renderer?: PortalRenderer;
  authoritativeForRouting: false;
  reason: string;
}

export function resolvePortal(
  descriptor: DimensionalPortalDescriptor,
  capabilities: PortalCapabilityContext
): PortalDecision {
  if (!descriptor.published || !descriptor.provenance.trim()) {
    return {
      allowed: false,
      authoritativeForRouting: false,
      reason: "Portal content must be published and have provenance."
    };
  }

  if (descriptor.sourceKind === "gaussian-splat") {
    if (capabilities.webGpu) {
      return {
        allowed: true,
        renderer: "three-webgpu",
        authoritativeForRouting: false,
        reason: "Render photoreal portal with WebGPU."
      };
    }
    return {
      allowed: false,
      authoritativeForRouting: false,
      reason: "Gaussian-splat portal requires WebGPU in the current research path."
    };
  }

  if (descriptor.sourceKind === "digital-twin" && capabilities.webGl) {
    return {
      allowed: true,
      renderer: "three-webgl",
      authoritativeForRouting: false,
      reason: "Render canonical Twin presentation with Three.js."
    };
  }

  if (descriptor.sourceKind === "panorama-360") {
    return {
      allowed: true,
      renderer: "css-panorama",
      authoritativeForRouting: false,
      reason: "Render panorama portal with broad fallback support."
    };
  }

  return {
    allowed: false,
    authoritativeForRouting: false,
    reason: "No compatible renderer is available."
  };
}
