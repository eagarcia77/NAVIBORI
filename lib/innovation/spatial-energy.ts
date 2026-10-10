export type SpatialEnergyChannel =
  | "event"
  | "accessibility"
  | "culture"
  | "operations"
  | "prediction";

export interface SpatialEnergyChannelState {
  channel: SpatialEnergyChannel;
  available: boolean;
  factual: boolean;
  reason: string;
}

export interface SpatialEnergyState {
  channels: SpatialEnergyChannelState[];
  activeCount: number;
  factualCount: number;
  predictiveCount: number;
}

export function buildSpatialEnergyState(input: {
  publishedEvent: boolean;
  publishedAccessibility: boolean;
  publishedCulture: boolean;
  publishedOperations: boolean;
  approvedPrediction: boolean;
}): SpatialEnergyState {
  const channels: SpatialEnergyChannelState[] = [
    {
      channel: "event",
      available: input.publishedEvent,
      factual: true,
      reason: input.publishedEvent ? "Published event available." : "No published event."
    },
    {
      channel: "accessibility",
      available: input.publishedAccessibility,
      factual: true,
      reason: input.publishedAccessibility ? "Published accessibility metadata available." : "No published accessibility layer."
    },
    {
      channel: "culture",
      available: input.publishedCulture,
      factual: true,
      reason: input.publishedCulture ? "Published cultural semantics available." : "No published cultural semantics."
    },
    {
      channel: "operations",
      available: input.publishedOperations,
      factual: true,
      reason: input.publishedOperations ? "Published operational state available." : "No published operational state."
    },
    {
      channel: "prediction",
      available: input.approvedPrediction,
      factual: false,
      reason: input.approvedPrediction ? "Approved predictive model available." : "No approved predictive model."
    }
  ];

  return {
    channels,
    activeCount: channels.filter((item) => item.available).length,
    factualCount: channels.filter((item) => item.available && item.factual).length,
    predictiveCount: channels.filter((item) => item.available && !item.factual).length
  };
}
