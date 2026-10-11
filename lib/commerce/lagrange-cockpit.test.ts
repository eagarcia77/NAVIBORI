import {describe,expect,it} from "vitest";
import {
  deriveLagrangeCockpitPhase,
  lagrangePhaseLabel
} from "./lagrange-cockpit";

describe("Lagrange Cockpit",()=>{
  it("stays idle without active GPS",()=>{
    expect(deriveLagrangeCockpitPhase({
      gpsActive:false,
      arrived:false,
      nextManeuverMeters:500,
      remainingMeters:5000,
      trajectoryRisk:"stable"
    })).toBe("idle");
  });

  it("uses cruise when guidance is stable and distant",()=>{
    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:false,
      nextManeuverMeters:900,
      remainingMeters:5000,
      trajectoryRisk:"stable"
    })).toBe("cruise");
  });

  it("enters approach near a maneuver or with drift watch",()=>{
    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:false,
      nextManeuverMeters:180,
      remainingMeters:1200,
      trajectoryRisk:"stable"
    })).toBe("approach");

    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:false,
      nextManeuverMeters:700,
      remainingMeters:1200,
      trajectoryRisk:"watch"
    })).toBe("approach");
  });

  it("enters vector phase for an imminent maneuver",()=>{
    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:false,
      nextManeuverMeters:55,
      remainingMeters:700,
      trajectoryRisk:"stable"
    })).toBe("vector");
  });

  it("prioritizes correction when trajectory warning is predicted",()=>{
    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:false,
      nextManeuverMeters:45,
      remainingMeters:700,
      trajectoryRisk:"warning"
    })).toBe("correction");
  });

  it("prioritizes arrival at the destination",()=>{
    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:true,
      nextManeuverMeters:10,
      remainingMeters:10,
      trajectoryRisk:"warning"
    })).toBe("arrival");

    expect(deriveLagrangeCockpitPhase({
      gpsActive:true,
      arrived:false,
      nextManeuverMeters:null,
      remainingMeters:20,
      trajectoryRisk:"stable"
    })).toBe("arrival");
  });

  it("localizes phase labels",()=>{
    expect(lagrangePhaseLabel("cruise","es")).toBe("CRUCERO");
    expect(lagrangePhaseLabel("correction","en")).toBe("CORRECTION");
  });
});
