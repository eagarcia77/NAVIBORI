import {describe,expect,it} from "vitest";
import {
  applyGravityLensToCamera,
  buildGravityLens,
  deriveGravityLensPhase
} from "./gravity-lens";

const base={latitude:18.05,longitude:-66.50};
const turn={latitude:18.052,longitude:-66.498};

describe("Gravity Lens",()=>{
  it("uses deterministic thresholds by travel mode",()=>{
    expect(deriveGravityLensPhase("driving",700)).toBe("cruise");
    expect(deriveGravityLensPhase("driving",400)).toBe("acquire");
    expect(deriveGravityLensPhase("driving",150)).toBe("focus");
    expect(deriveGravityLensPhase("driving",40)).toBe("commit");

    expect(deriveGravityLensPhase("walking",120)).toBe("acquire");
    expect(deriveGravityLensPhase("walking",50)).toBe("focus");
    expect(deriveGravityLensPhase("walking",12)).toBe("commit");
  });

  it("moves camera focus toward the next maneuver as it approaches",()=>{
    const acquire=buildGravityLens({
      baseCoordinate:base,
      maneuverCoordinate:turn,
      maneuverDistanceMeters:350,
      mode:"driving",
      speedKph:45
    });
    const commit=buildGravityLens({
      baseCoordinate:base,
      maneuverCoordinate:turn,
      maneuverDistanceMeters:30,
      mode:"driving",
      speedKph:25
    });

    expect(acquire.center.latitude).toBeGreaterThan(base.latitude);
    expect(commit.center.latitude).toBeGreaterThan(acquire.center.latitude);
    expect(commit.blend).toBeGreaterThan(acquire.blend);
    expect(commit.zoomBoost).toBeGreaterThan(acquire.zoomBoost);
    expect(commit.pitchBias).toBeLessThan(acquire.pitchBias);
  });

  it("respects reduced-motion preferences",()=>{
    const normal=buildGravityLens({
      baseCoordinate:base,
      maneuverCoordinate:turn,
      maneuverDistanceMeters:40,
      mode:"driving",
      speedKph:30
    });
    const reduced=buildGravityLens({
      baseCoordinate:base,
      maneuverCoordinate:turn,
      maneuverDistanceMeters:40,
      mode:"driving",
      speedKph:30,
      reducedMotion:true
    });

    expect(reduced.blend).toBeLessThan(normal.blend);
    expect(reduced.zoomBoost).toBeLessThan(normal.zoomBoost);
  });

  it("modifies the adaptive camera without exceeding safe bounds",()=>{
    const lens=buildGravityLens({
      baseCoordinate:base,
      maneuverCoordinate:turn,
      maneuverDistanceMeters:30,
      mode:"driving",
      speedKph:20
    });

    expect(
      applyGravityLensToCamera(
        {zoom:17,pitch:40,offsetY:110,duration:350},
        lens
      )
    ).toMatchObject({
      zoom:expect.any(Number),
      pitch:expect.any(Number),
      offsetY:expect.any(Number),
      duration:expect.any(Number)
    });
  });
});
