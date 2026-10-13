import {describe,expect,it} from "vitest";
import {
  gpsSignalQuality,
  normalizedBearing,
  shortestBearingDelta,
  shouldDrawSvgFallback,
  stabilizedCameraBearing
} from "./novascene-gps-stability";

describe("NovaScene 2.5 visual camera stabilization",()=>{
  it("wraps around north by shortest direction, never spinning 358 degrees",()=>{
    expect(normalizedBearing(-5)).toBe(355);
    expect(normalizedBearing(365)).toBe(5);
    expect(shortestBearingDelta(359,1)).toBe(2);
    expect(shortestBearingDelta(1,359)).toBe(-2);
    const next=stabilizedCameraBearing(359,3,40,7);
    expect(next).not.toBeNull();
    expect(shortestBearingDelta(359,next!)).toBeGreaterThan(0);
    expect(shortestBearingDelta(359,next!)).toBeLessThan(4);
  });
  it("damages neither route heading nor measured GPS fixes",()=>{
    const proposed=100;
    const camera=stabilizedCameraBearing(30,proposed,25,8);
    expect(camera).not.toBe(proposed);
    expect(camera).toBeGreaterThan(30);
    expect(proposed).toBe(100);
    expect(stabilizedCameraBearing(null,90,0,null)).toBe(90);
    expect(stabilizedCameraBearing(43,null,10,null)).toBe(43);
    expect(stabilizedCameraBearing(43,Number.NaN,10,null)).toBe(43);
  });
  it("reduces small heading jitter at walking speeds and poor fixes",()=>{
    expect(stabilizedCameraBearing(90,91,1,20)).toBe(90);
    const precise=stabilizedCameraBearing(90,150,45,8)!;
    const inaccurate=stabilizedCameraBearing(90,150,45,120)!;
    expect(precise).toBeGreaterThan(inaccurate);
    expect(inaccurate).toBeGreaterThan(90);
    expect(precise).toBeLessThanOrEqual(175);
  });
});

describe("NovaScene 2.5 route backup and signal confidence",()=>{
  it("uses SVG only if the map actually lacks a rendered native route",()=>{
    expect(shouldDrawSvgFallback(false)).toBe(true);
    expect(shouldDrawSvgFallback(true)).toBe(false);
  });
  it("never claims precise GPS when browser accuracy is missing or poor",()=>{
    expect(gpsSignalQuality(null)).toBe("searching");
    expect(gpsSignalQuality(Number.NaN)).toBe("searching");
    expect(gpsSignalQuality(-1)).toBe("searching");
    expect(gpsSignalQuality(8)).toBe("precise");
    expect(gpsSignalQuality(30)).toBe("moderate");
    expect(gpsSignalQuality(80)).toBe("weak");
  });
});
