export type RealityIntensity = "physical" | "semantic" | "predictive" | "immersive";

export interface RealityIntensityContext {
  verifiedSpatialData: boolean;
  semanticDataAvailable: boolean;
  predictiveModelAvailable: boolean;
  immersiveCapable: boolean;
  immersiveConsent: boolean;
}

export interface RealityIntensityDecision {
  requested: RealityIntensity;
  allowed: boolean;
  effective: RealityIntensity;
  reason?: string;
}

const order: RealityIntensity[] = ["physical","semantic","predictive","immersive"];

export function resolveRealityIntensity(
  requested: RealityIntensity,
  context: RealityIntensityContext
): RealityIntensityDecision {
  if (requested === "physical") {
    return { requested, allowed: true, effective: "physical" };
  }

  if (requested === "semantic") {
    if (!context.semanticDataAvailable) {
      return {
        requested,
        allowed: false,
        effective: "physical",
        reason: "Semantic data has not been published for this venue."
      };
    }
    return { requested, allowed: true, effective: "semantic" };
  }

  if (requested === "predictive") {
    if (!context.verifiedSpatialData || !context.predictiveModelAvailable) {
      const fallback = context.semanticDataAvailable ? "semantic" : "physical";
      return {
        requested,
        allowed: false,
        effective: fallback,
        reason: "Predictive mode requires verified spatial data and an approved predictive model."
      };
    }
    return { requested, allowed: true, effective: "predictive" };
  }

  if (!context.verifiedSpatialData || !context.immersiveCapable || !context.immersiveConsent) {
    const fallback =
      context.predictiveModelAvailable && context.verifiedSpatialData
        ? "predictive"
        : context.semanticDataAvailable
          ? "semantic"
          : "physical";

    return {
      requested,
      allowed: false,
      effective: fallback,
      reason: "Immersive mode requires verified data, compatible XR hardware and explicit consent."
    };
  }

  return { requested, allowed: true, effective: "immersive" };
}

export function realityIntensityIndex(value: RealityIntensity) {
  return order.indexOf(value);
}
