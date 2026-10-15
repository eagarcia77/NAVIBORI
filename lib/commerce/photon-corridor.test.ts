import {describe,expect,it} from "vitest";
import {
  buildPhotonRouteGradient,
  clampRouteProgress
} from "./photon-corridor";

describe("Photon Corridor",()=>{
  it("clamps route progress safely",()=>{
    expect(clampRouteProgress(-1)).toBe(0);
    expect(clampRouteProgress(0.4)).toBe(0.4);
    expect(clampRouteProgress(2)).toBe(1);
    expect(clampRouteProgress(Number.NaN)).toBe(0);
  });

  it("keeps the full route bright before navigation begins",()=>{
    expect(buildPhotonRouteGradient(0,"#0a84ff")).toEqual([
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      "#0a84ff",
      1,
      "#0a84ff"
    ]);
  });

  it("dims traveled route and creates a bright photon edge",()=>{
    const gradient=buildPhotonRouteGradient(0.5,"#0a84ff");
    expect(gradient).toContain("#7b8794");
    expect(gradient).toContain("#ffffff");
    expect(gradient).toContain("#0a84ff");
    expect(gradient).toContain(0.5);
  });

  it("keeps arrival visible when progress is complete",()=>{
    const gradient=buildPhotonRouteGradient(1,"#0a84ff");
    expect(gradient.at(-1)).toBe("#ffffff");
  });
});
