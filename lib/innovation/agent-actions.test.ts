import { describe, expect, it } from "vitest";
import { createAgentActionEnvelope, isNavigationAction } from "./agent-actions";

describe("NAVIBORI agent command bus", () => {
  it("marks mode transitions as confirmation-required", () => {
    const envelope = createAgentActionEnvelope("holo-coqui", {
      type: "enter_mode",
      mode: "ar"
    });
    expect(envelope.requiresConfirmation).toBe(true);
  });

  it("does not require confirmation for focusing a published entity", () => {
    const envelope = createAgentActionEnvelope("assistant", {
      type: "focus_poi",
      poiId: "poi-1"
    });
    expect(envelope.requiresConfirmation).toBe(false);
  });

  it("identifies navigation actions", () => {
    expect(isNavigationAction({
      type: "route_to",
      poiId: "poi-1",
      profile: "accessible"
    })).toBe(true);
  });
});
