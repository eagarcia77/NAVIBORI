export type HoloCoquiState =
  | "idle"
  | "discover"
  | "route"
  | "scan"
  | "portal"
  | "explain"
  | "blocked";

export interface HoloCoquiContext {
  verifiedSpatialData: boolean;
  routeAvailable: boolean;
  immersiveCapable: boolean;
  explicitXrConsent: boolean;
  portalPublished: boolean;
}

export function resolveHoloCoquiState(
  requested: HoloCoquiState,
  context: HoloCoquiContext
): HoloCoquiState {
  if (requested === "route" && (!context.verifiedSpatialData || !context.routeAvailable)) {
    return "blocked";
  }

  if (requested === "portal" && !context.portalPublished) {
    return "blocked";
  }

  if (requested === "scan" && (!context.immersiveCapable || !context.explicitXrConsent)) {
    return "blocked";
  }

  return requested;
}
