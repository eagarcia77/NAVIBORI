import {describe,expect,it} from "vitest";
import {
  buildOrbitalLookahead,
  coordinateAtRouteDistance,
  orbitalLookaheadDistance
} from "./orbital-lookahead";
import type {InMapRouteResult} from "./in-map-routing";

const route:InMapRouteResult={
  mode:"driving",
  distanceMeters:3000,
  durationSeconds:360,
  geometry:{
    type:"LineString",
    coordinates:[
      [-66.50,18.00],
      [-66.50,18.01],
      [-66.49,18.01]
    ]
  },
  steps:[],
  provider:"OSRM / OpenStreetMap"
};

describe("Orbital Lookahead",()=>{
  it("looks farther ahead as driving speed increases",()=>{
    const slow=orbitalLookaheadDistance("driving",15,null);
    const fast=orbitalLookaheadDistance("driving",90,null);
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeLessThanOrEqual(420);
  });

  it("compresses the horizon near the next maneuver",()=>{
    const openRoad=orbitalLookaheadDistance("driving",80,900);
    const nearTurn=orbitalLookaheadDistance("driving",80,60);
    expect(nearTurn).toBeLessThan(openRoad);
    expect(nearTurn).toBeGreaterThanOrEqual(16);
  });

  it("interpolates a coordinate along route geometry",()=>{
    const coordinate=coordinateAtRouteDistance(route,500);
    expect(coordinate).not.toBeNull();
    expect(coordinate!.longitude).toBeCloseTo(-66.5,3);
    expect(coordinate!.latitude).toBeGreaterThan(18);
  });

  it("never targets beyond the route destination",()=>{
    const target=buildOrbitalLookahead(
      route,
      2950,
      "driving",
      100,
      null
    );
    expect(target).not.toBeNull();
    expect(target!.routeDistanceMeters).toBe(3000);
    expect(target!.coordinate.longitude).toBeCloseTo(-66.49,5);
    expect(target!.coordinate.latitude).toBeCloseTo(18.01,5);
  });

  it("uses shorter horizons for walking",()=>{
    const walking=orbitalLookaheadDistance("walking",5,null);
    const driving=orbitalLookaheadDistance("driving",50,null);
    expect(walking).toBeLessThan(driving);
  });
});
