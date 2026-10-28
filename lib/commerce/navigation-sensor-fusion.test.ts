import {describe,expect,it} from "vitest";
import {
  blendHeadings,
  chooseNavigationBearing,
  normalizeHeading
} from "./navigation-sensor-fusion";

describe("navigation sensor fusion",()=>{
  it("normalizes headings",()=>{
    expect(normalizeHeading(370)).toBe(10);
    expect(normalizeHeading(-10)).toBe(350);
  });

  it("blends across north without wrapping the long way",()=>{
    expect(blendHeadings(350,10,0.5)).toBeCloseTo(0,5);
  });

  it("prefers GPS heading while moving and route heading as a stabilizer",()=>{
    const bearing=chooseNavigationBearing({
      gpsHeading:92,
      speedKph:35,
      deviceHeading:110,
      routeHeading:90
    });
    expect(bearing).toBeCloseTo(91.64,1);
  });

  it("uses device orientation when GPS heading is unavailable",()=>{
    const bearing=chooseNavigationBearing({
      gpsHeading:null,
      speedKph:0,
      deviceHeading:178,
      routeHeading:180
    });
    expect(bearing).toBeCloseTo(178.76,1);
  });

  it("falls back to route heading",()=>{
    expect(chooseNavigationBearing({
      gpsHeading:null,
      speedKph:null,
      deviceHeading:null,
      routeHeading:270
    })).toBe(270);
  });
});
