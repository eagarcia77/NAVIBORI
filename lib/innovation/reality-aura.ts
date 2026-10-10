export type RealityAuraKind =
  | "neutral"
  | "culture"
  | "event"
  | "accessibility"
  | "operational"
  | "predictive";

export interface RealityAuraInput {
  publishedSemanticTags: string[];
  activeEvent: boolean;
  accessibilityFeaturesPublished: boolean;
  operationalNoticePublished: boolean;
  approvedPredictionAvailable: boolean;
}

export interface RealityAura {
  kind: RealityAuraKind;
  label: string;
  factual: boolean;
  sources: string[];
}

export function resolveRealityAura(input: RealityAuraInput): RealityAura {
  if (input.operationalNoticePublished) {
    return {
      kind: "operational",
      label: "Operational state",
      factual: true,
      sources: ["published operational notice"]
    };
  }

  if (input.activeEvent) {
    return {
      kind: "event",
      label: "Active event",
      factual: true,
      sources: ["published event"]
    };
  }

  if (input.accessibilityFeaturesPublished) {
    return {
      kind: "accessibility",
      label: "Accessibility-aware space",
      factual: true,
      sources: ["published accessibility metadata"]
    };
  }

  if (input.publishedSemanticTags.some((tag) =>
    ["culture","heritage","history","art"].includes(tag.toLowerCase())
  )) {
    return {
      kind: "culture",
      label: "Cultural layer",
      factual: true,
      sources: ["published semantic metadata"]
    };
  }

  if (input.approvedPredictionAvailable) {
    return {
      kind: "predictive",
      label: "Predicted state",
      factual: false,
      sources: ["approved predictive model"]
    };
  }

  return {
    kind: "neutral",
    label: "Physical reality",
    factual: true,
    sources: ["canonical published spatial dataset"]
  };
}
