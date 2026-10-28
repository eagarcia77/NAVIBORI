export type NaviHaloState =
  | "verified"
  | "draft"
  | "predictive"
  | "experimental"
  | "blocked";

export interface NaviHaloDescriptor {
  state: NaviHaloState;
  label: string;
  factual: boolean;
}

export function resolveNaviHalo(input: {
  verifiedSpatialData: boolean;
  predictionActive: boolean;
  xenoMode: boolean;
  blocked: boolean;
}): NaviHaloDescriptor {
  if (input.blocked) {
    return { state: "blocked", label: "Blocked by spatial truth", factual: true };
  }

  if (input.predictionActive) {
    return { state: "predictive", label: "Predictive — not factual", factual: false };
  }

  if (input.xenoMode) {
    return { state: "experimental", label: "XENO research mode", factual: false };
  }

  if (input.verifiedSpatialData) {
    return { state: "verified", label: "Verified spatial truth", factual: true };
  }

  return { state: "draft", label: "Draft spatial state", factual: true };
}
