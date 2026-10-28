import {describe,it,expect} from "vitest";
import {formatNaviboriDistance,formatNaviboriManeuverDistance,resolveNaviboriDistanceUnits} from "./distance-display";

describe("NAVIBORI language-independent distance preferences",()=>{
  it("defaults Puerto Rico and United States to miles even in Spanish",()=>{
    expect(resolveNaviboriDistanceUnits("auto","es-PR")).toBe("imperial");
    expect(resolveNaviboriDistanceUnits("auto","en-US")).toBe("imperial");
    expect(resolveNaviboriDistanceUnits("auto","es-ES")).toBe("metric");
  });
  it("honors user preference regardless of locale",()=>{
    expect(resolveNaviboriDistanceUnits("metric","en-US")).toBe("metric");
    expect(resolveNaviboriDistanceUnits("imperial","es-ES")).toBe("imperial");
  });
  it("uses matching units for maneuver instruction and route summary",()=>{
    expect(formatNaviboriDistance(4800,"imperial")).toBe("3.0 mi");
    expect(formatNaviboriManeuverDistance(221,"en","imperial")).toBe("In 725 ft");
    expect(formatNaviboriManeuverDistance(221,"es","metric")).toBe("En 220 m");
    expect(formatNaviboriDistance(4800,"metric")).toBe("4.8 km");
  });
  it("handles invalid data without displaying misleading distances",()=>{
    expect(formatNaviboriDistance(NaN,"metric")).toBe("—");
    expect(formatNaviboriManeuverDistance(-2,"en","imperial")).toBe("—");
  });
});
