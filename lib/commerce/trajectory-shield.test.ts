import {describe,expect,it} from "vitest";
import {
  adaptiveCameraProfile,
  buildTrajectoryPrediction,
  projectCoordinate,
  trajectoryHorizonSeconds
} from "./trajectory-shield";
import type {InMapRouteResult} from "./in-map-routing";

const route:InMapRouteResult={
  mode:"driving",
  distanceMeters:2200,
  durationSeconds:260,
  geometry:{
    type:"LineString",
    coordinates:[
      [-66.5000,18.0000],
      [-66.5000,18.0200]
    ]
  },
  steps:[],
  provider:"OSRM / OpenStreetMap"
};

describe("Trajectory Shield",()=>{
  it("projects coordinates in the expected direction",()=>{
    const north=projectCoordinate(
      {latitude:18,longitude:-66.5},
      0,
      100
    );
    expect(north.latitude).toBeGreaterThan(18);
    expect(north.longitude).toBeCloseTo(-66.5,4);
  });

  it("extends the prediction horizon at highway speed",()=>{
    expect(trajectoryHorizonSeconds("driving",80))
      .toBeGreaterThan(trajectoryHorizonSeconds("driving",20));
  });

  it("stays stable when the projected motion follows the route",()=>{
    const prediction=buildTrajectoryPrediction(
      route,
      {latitude:18.005,longitude:-66.50002},
      0,
      45,
      6
    );
    expect(prediction).not.toBeNull();
    expect(prediction!.risk).toBe("stable");
    expect(prediction!.futureDistanceFromRouteMeters)
      .toBeLessThan(prediction!.thresholdMeters);
  });

  it("warns before motion leaves the route corridor",()=>{
    const prediction=buildTrajectoryPrediction(
      route,
      {latitude:18.005,longitude:-66.50002},
      90,
      45,
      6
    );
    expect(prediction).not.toBeNull();
    expect(prediction!.risk).toBe("warning");
    expect(prediction!.futureDistanceFromRouteMeters)
      .toBeGreaterThan(prediction!.thresholdMeters);
  });

  it("zooms closer for an imminent maneuver",()=>{
    const cruise=adaptiveCameraProfile("driving",65,800,"stable");
    const turn=adaptiveCameraProfile("driving",65,45,"stable");
    expect(turn.zoom).toBeGreaterThan(cruise.zoom);
    expect(turn.offsetY).toBeLessThan(cruise.offsetY);
  });

  it("uses a focused camera when drift risk is warning",()=>{
    const warning=adaptiveCameraProfile("driving",55,500,"warning");
    expect(warning.zoom).toBeGreaterThan(17);
    expect(warning.pitch).toBeLessThan(40);
  });
});
