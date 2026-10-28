import {describe,expect,it} from "vitest";
import {
  deriveFlightDirectorState,
  flightDirectorHapticPattern,
  flightDirectorLabel,
  normalizeBearingDelta
} from "./astra-flight-director";

describe("Astra Flight Director",()=>{
  it("normalizes bearing deltas across north",()=>{
    expect(normalizeBearingDelta(10,350)).toBe(20);
    expect(normalizeBearingDelta(350,10)).toBe(-20);
  });

  it("locks when heading and route deviation are aligned",()=>{
    const state=deriveFlightDirectorState({
      routeBearing:90,
      navigationBearing:94,
      routeDeviationMeters:4,
      gpsAccuracyMeters:5,
      speedKph:35
    });

    expect(state.phase).toBe("locked");
    expect(state.correction).toBe("center");
    expect(state.confidence).toBeGreaterThan(70);
  });

  it("commands right correction when the route is clockwise from travel",()=>{
    const state=deriveFlightDirectorState({
      routeBearing:90,
      navigationBearing:35,
      routeDeviationMeters:12,
      gpsAccuracyMeters:8,
      speedKph:45
    });

    expect(state.phase).toBe("correct");
    expect(state.correction).toBe("right");
    expect(state.cueOffset).toBeGreaterThan(0);
    expect(flightDirectorLabel(state,"es")).toBe("CORRIGE DERECHA");
  });

  it("commands left correction when the route is counter-clockwise",()=>{
    const state=deriveFlightDirectorState({
      routeBearing:20,
      navigationBearing:75,
      routeDeviationMeters:10,
      gpsAccuracyMeters:8,
      speedKph:25
    });

    expect(state.correction).toBe("left");
    expect(state.cueOffset).toBeLessThan(0);
    expect(flightDirectorLabel(state,"en")).toBe("CORRECT LEFT");
  });

  it("acquires when no reliable bearing exists",()=>{
    const state=deriveFlightDirectorState({
      routeBearing:null,
      navigationBearing:null,
      routeDeviationMeters:null,
      gpsAccuracyMeters:30,
      speedKph:null
    });

    expect(state.phase).toBe("acquire");
    expect(state.confidence).toBe(0);
  });

  it("uses restrained haptics only for state transitions",()=>{
    expect(flightDirectorHapticPattern("align","correct")).toEqual([28,38,28]);
    expect(flightDirectorHapticPattern("correct","locked")).toBe(18);
    expect(flightDirectorHapticPattern("locked","locked")).toBeNull();
  });
});
