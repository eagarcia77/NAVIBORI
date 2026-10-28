import { describe, expect, it } from "vitest";
import { resolvePortal } from "./portal-engine";

describe("Dimensional Portal Engine", () => {
  it("never makes portal media authoritative for routing", () => {
    const decision = resolvePortal({
      id: "portal-1",
      title: "Demo",
      sourceKind: "panorama-360",
      sourceUrl: "/demo.jpg",
      published: true,
      provenance: "verified capture"
    }, { webGpu: false, webGl: true });

    expect(decision.allowed).toBe(true);
    expect(decision.authoritativeForRouting).toBe(false);
  });

  it("blocks unpublished portal content", () => {
    const decision = resolvePortal({
      id: "portal-2",
      title: "Draft",
      sourceKind: "digital-twin",
      sourceUrl: "/draft",
      published: false,
      provenance: "demo"
    }, { webGpu: true, webGl: true });

    expect(decision.allowed).toBe(false);
  });
});
