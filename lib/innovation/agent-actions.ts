export type NaviboriAgentAction =
  | { type: "focus_poi"; poiId: string }
  | { type: "route_to"; poiId: string; profile: "standard" | "accessible" }
  | { type: "open_map_layer"; layer: "places" | "events" | "accessibility" | "quests" }
  | { type: "open_portal"; experienceId: string }
  | { type: "start_quest"; questId: string }
  | { type: "speak"; message: string }
  | { type: "show_card"; entityType: "poi" | "event" | "business"; entityId: string }
  | { type: "enter_mode"; mode: "map" | "ar" | "vr" | "twin" };

export interface AgentActionEnvelope {
  id: string;
  createdAt: string;
  source: "holo-coqui" | "assistant" | "visitor" | "system";
  action: NaviboriAgentAction;
  requiresConfirmation: boolean;
}

const actionsRequiringConfirmation = new Set<NaviboriAgentAction["type"]>([
  "open_portal",
  "start_quest",
  "enter_mode"
]);

export function createAgentActionEnvelope(
  source: AgentActionEnvelope["source"],
  action: NaviboriAgentAction
): AgentActionEnvelope {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source,
    action,
    requiresConfirmation: actionsRequiringConfirmation.has(action.type)
  };
}

export function isNavigationAction(action: NaviboriAgentAction) {
  return action.type === "route_to";
}
