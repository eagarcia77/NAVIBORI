import {describe,expect,it} from "vitest";
import {buildDriftBridgeEstimate,driftBridgeWindow} from "./astra-drift-bridge";
import type {InMapRouteResult} from "./in-map-routing";

const route:InMapRouteResult={
  mode:"driving",
  distanceMeters:1000,
  durationSeconds:120,
  geometry:{
    type:"LineString",
    coordinates:[
      [-66.50,18.00],
      [-66.50,18.005],
      [-66.49,18.005]
    ]
  },
  steps:[],
  provider:"OSRM / OpenStreetMap"
};

describe("ASTRA Drift Bridge",()=>{
  it("stays inactive while GPS fixes are still fresh",()=>{
    const estimate=buildDriftBridgeEstimate(
      route,
      100,
      36,
      driftBridgeWindow().minStaleMs-100,
      5
    );

    expect(estimate.phase).toBe("inactive");
    expect(estimate.coordinate).toBeNull();
  });

  it("projects a short GPS outage forward along the known route",()=>{
    const estimate=buildDriftBridgeEstimate(
      route,
      100,
      36,
      4000,
      5
    );

    expect(estimate.phase).toBe("holding");
    expect(estimate.coordinate).not.toBeNull();
    expect(estimate.projectedMeters).toBeCloseTo(40,0);
    expect(estimate.routeDistanceMeters).toBeCloseTo(140,0);
    expect(estimate.confidence).toBeGreaterThan(40);
  });

  it("expires instead of pretending certainty during long GPS loss",()=>{
    const estimate=buildDriftBridgeEstimate(
      route,
      100,
      50,
      driftBridgeWindow().maxHoldMs+500,
      5
    );

    expect(estimate.phase).toBe("expired");
    expect(estimate.coordinate).toBeNull();
    expect(estimate.confidence).toBe(0);
  });

  it("does not project a nearly stationary vehicle",()=>{
    const estimate=buildDriftBridgeEstimate(
      route,
      100,
      1,
      4000,
      5
    );

    expect(estimate.phase).toBe("inactive");
  });
});
