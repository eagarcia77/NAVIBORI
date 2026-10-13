import {describe,expect,it} from "vitest";
import {geoSegmentMeters,nearTurnZoom,nextRouteCorridor} from "./novascene-route-focus";
import {novaSceneRoofPaint,novaSceneHeightExpression} from "./novascene-appearance";

describe("NovaScene 2.4 turn route spotlight",()=>{
  const road=[
    [-66.510,18.050],
    [-66.510,18.051],
    [-66.509,18.051],
    [-66.508,18.051]
  ];
  it("clips the next route segment by distance while preserving road bends",()=>{
    const coords=nextRouteCorridor(road,0,145);
    expect(coords.length).toBeGreaterThanOrEqual(3);
    expect(coords[0]).toEqual(road[0]);
    expect(coords.some(point=>point[0]===-66.510&&point[1]===18.051)).toBe(true);
    const length=coords.slice(1).reduce((sum,p,i)=>sum+geoSegmentMeters(coords[i],p),0);
    expect(length).toBeGreaterThan(143);
    expect(length).toBeLessThan(147);
  });
  it("shows only road ahead at partial progress and never extends beyond the route",()=>{
    const coords=nextRouteCorridor(road,0.83,145);
    expect(coords.length).toBeGreaterThanOrEqual(2);
    expect(coords[0][0]).toBeGreaterThan(-66.510);
    expect(coords[coords.length-1]).toEqual(road[road.length-1]);
    expect(nextRouteCorridor(road,1,145)).toEqual([]);
    expect(nextRouteCorridor([],0)).toEqual([]);
    expect(nextRouteCorridor(road,Number.NaN)).toEqual([]);
    expect(nextRouteCorridor([[1,1],[1,1]],0)).toEqual([]);
  });
  it("limits spotlight length and rejects impossible camera zoom requests",()=>{
    const coords=nextRouteCorridor(road,0,10_000);
    const length=coords.slice(1).reduce((sum,p,i)=>sum+geoSegmentMeters(coords[i],p),0);
    expect(length).toBeLessThanOrEqual(301);
    expect(nearTurnZoom(17,200)).toBe(17);
    expect(nearTurnZoom(17,180)).toBe(17);
    expect(nearTurnZoom(17,35)).toBeCloseTo(17.3);
    expect(nearTurnZoom(19,10)).toBe(19);
    expect(nearTurnZoom(20,null)).toBe(19);
    expect(nearTurnZoom(Number.NaN,20)).toBe(17);
  });
});

describe("NovaScene 2.4 architectural roof caps",()=>{
  it("keeps a shallow roof shell just above the matching extruded walls",()=>{
    for(const appearance of ["natural","digital"] as const){
      const roof=novaSceneRoofPaint(appearance);
      const roofJson=JSON.stringify(roof);
      expect(roofJson).toContain("fill-extrusion-base");
      expect(roofJson).toContain("estimated");
      expect(roofJson).toContain("height");
      expect(roof["fill-extrusion-vertical-gradient"]).toBe(false);
      expect(roof["fill-extrusion-opacity"]).toBeGreaterThan(0.85);
      expect(JSON.stringify(novaSceneHeightExpression(appearance))).toContain("height");
    }
  });
});
