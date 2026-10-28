import {describe,expect,it} from "vitest";
import {
  ESTIMATED_HEIGHT_SCALE,
  approachTurnPitch,
  novaSceneBuildingPaint,
  novaSceneHeightExpression,
  visualBuildingHeight
} from "./novascene-appearance";

describe("NovaScene 2.3 architecture rendering",()=>{
  it("shows realistic lower-rise estimated houses without changing measured heights",()=>{
    expect(visualBuildingHeight(6.6,true,"natural")).toBeCloseTo(4.356,3);
    expect(visualBuildingHeight(7.8,true,"natural")).toBeCloseTo(5.148,3);
    expect(visualBuildingHeight(10.2,true,"natural")).toBeCloseTo(6.732,3);
    expect(visualBuildingHeight(10.2,true,"digital")).toBe(10.2);
    expect(visualBuildingHeight(17.5,false,"natural")).toBe(17.5);
    expect(visualBuildingHeight(17.5,false,"digital")).toBe(17.5);
    expect(visualBuildingHeight(Number.NaN,true,"natural")).toBeGreaterThan(3);
    expect(visualBuildingHeight(300,true,"natural")).toBeLessThanOrEqual(7.2);
  });
  it("builds a camera-independent WebGL height expression from the same scale",()=>{
    const natural=JSON.stringify(novaSceneHeightExpression("natural"));
    const digital=JSON.stringify(novaSceneHeightExpression("digital"));
    expect(natural).toContain(String(ESTIMATED_HEIGHT_SCALE));
    expect(natural).toContain("estimated");
    expect(natural).toContain("height");
    expect(digital).not.toContain(String(ESTIMATED_HEIGHT_SCALE));
    expect(novaSceneBuildingPaint("natural")["fill-extrusion-vertical-gradient"]).toBe(true);
    expect(novaSceneBuildingPaint("natural")["fill-extrusion-opacity"]).toBeGreaterThan(0.85);
  });
  it("separates natural building facades and roof caps visually without modifying height expressions",()=>{
    const natural=novaSceneBuildingPaint("natural");
    expect(JSON.stringify(natural["fill-extrusion-color"])).toContain("#c4b9ab");
    expect(JSON.stringify(natural["fill-extrusion-height"])).toContain("height");
    expect(natural["fill-extrusion-vertical-gradient"]).toBe(true);
  });
  it("keeps junction geometry visible as turn distance decreases",()=>{
    expect(approachTurnPitch(58,null)).toBe(58);
    expect(approachTurnPitch(58,200)).toBe(58);
    expect(approachTurnPitch(58,180)).toBe(58);
    expect(approachTurnPitch(58,110)).toBe(52);
    expect(approachTurnPitch(58,40)).toBe(46);
    expect(approachTurnPitch(58,5)).toBe(46);
    expect(approachTurnPitch(44,5)).toBe(44);
    expect(approachTurnPitch(57,Number.NaN)).toBe(57);
  });
});
