export type NaviSpecialist =
  | "route"
  | "accessibility"
  | "culture"
  | "events"
  | "commerce"
  | "twin"
  | "xeno";

export type NaviIntent =
  | { type: "explain_state" }
  | { type: "discover"; category?: string }
  | { type: "route"; destinationPoiId: string; accessible: boolean }
  | { type: "open_reality"; mode: "map" | "twin" | "ar" | "vr" }
  | { type: "open_portal"; portalId: string }
  | { type: "time_echo"; entityId: string };

export interface NaviContext {
  verifiedSpatialData: boolean;
  publishedRouteGraph: boolean;
  accessibilityMetadata: boolean;
  xrCapable: boolean;
  xrConsent: boolean;
  publishedPortalIds: string[];
  temporalHistoryAvailable: boolean;
}

export interface NaviDecision {
  specialist: NaviSpecialist;
  allowed: boolean;
  message: string;
  requiresConfirmation: boolean;
}

export function resolveNaviIntent(intent: NaviIntent, context: NaviContext): NaviDecision {
  if (intent.type === "explain_state") {
    return {
      specialist: "xeno",
      allowed: true,
      message: context.verifiedSpatialData
        ? "Spatial truth is verified for this experience."
        : "Pilot spatial truth is still incomplete; I will not invent indoor geometry.",
      requiresConfirmation: false
    };
  }

  if (intent.type === "discover") {
    return {
      specialist: "culture",
      allowed: true,
      message: "I can explore published places and experiences.",
      requiresConfirmation: false
    };
  }

  if (intent.type === "route") {
    if (!context.verifiedSpatialData || !context.publishedRouteGraph) {
      return {
        specialist: intent.accessible ? "accessibility" : "route",
        allowed: false,
        message: "Indoor route guidance is blocked until a validated route graph is published.",
        requiresConfirmation: false
      };
    }

    if (intent.accessible && !context.accessibilityMetadata) {
      return {
        specialist: "accessibility",
        allowed: false,
        message: "Accessible routing requires published accessibility metadata.",
        requiresConfirmation: false
      };
    }

    return {
      specialist: intent.accessible ? "accessibility" : "route",
      allowed: true,
      message: "Validated route guidance is available.",
      requiresConfirmation: true
    };
  }

  if (intent.type === "open_reality") {
    if ((intent.mode === "ar" || intent.mode === "vr") && (!context.xrCapable || !context.xrConsent)) {
      return {
        specialist: "twin",
        allowed: false,
        message: "Immersive mode requires compatible hardware and explicit consent.",
        requiresConfirmation: false
      };
    }

    return {
      specialist: "twin",
      allowed: true,
      message: "Reality transition is available.",
      requiresConfirmation: intent.mode === "ar" || intent.mode === "vr"
    };
  }

  if (intent.type === "open_portal") {
    const allowed = context.publishedPortalIds.includes(intent.portalId);
    return {
      specialist: "xeno",
      allowed,
      message: allowed ? "Published dimensional portal is ready." : "Portal is not published or verified.",
      requiresConfirmation: allowed
    };
  }

  return {
    specialist: "culture",
    allowed: context.temporalHistoryAvailable,
    message: context.temporalHistoryAvailable
      ? "Temporal history is available for this entity."
      : "No published temporal history exists yet.",
    requiresConfirmation: false
  };
}
