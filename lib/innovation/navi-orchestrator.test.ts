import { describe, expect, it } from "vitest";
import { resolveNaviIntent } from "./navi-orchestrator";

const base = {
  verifiedSpatialData: false,
  publishedRouteGraph: false,
  accessibilityMetadata: false,
  xrCapable: false,
  xrConsent: false,
  publishedPortalIds: [],
  temporalHistoryAvailable: false
};

describe("Navi Orchestrator", () => {
  it("refuses to invent indoor routing", () => {
    const decision = resolveNaviIntent(
      { type: "route", destinationPoiId: "poi-1", accessible: false },
      base
    );
    expect(decision.allowed).toBe(false);
  });

  it("can always explain current truth state", () => {
    const decision = resolveNaviIntent({ type: "explain_state" }, base);
    expect(decision.allowed).toBe(true);
    expect(decision.message).toContain("will not invent");
  });

  it("requires confirmation for valid immersive transitions", () => {
    const decision = resolveNaviIntent(
      { type: "open_reality", mode: "ar" },
      { ...base, xrCapable: true, xrConsent: true }
    );
    expect(decision.allowed).toBe(true);
    expect(decision.requiresConfirmation).toBe(true);
  });
});
