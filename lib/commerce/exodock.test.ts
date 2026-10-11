import {describe,expect,it} from "vitest";
import {
  deriveExoDockState,
  exoDockCameraProfile,
  exoDockLabel
} from "./exodock";

describe("EXODOCK final approach",()=>{
  it("stays inactive outside final approach",()=>{
    expect(deriveExoDockState({
      gpsActive:true,
      arrived:false,
      remainingMeters:181
    })).toBe("inactive");
  });

  it("progresses through acquire, align and dock",()=>{
    expect(deriveExoDockState({
      gpsActive:true,
      arrived:false,
      remainingMeters:180
    })).toBe("acquire");

    expect(deriveExoDockState({
      gpsActive:true,
      arrived:false,
      remainingMeters:80
    })).toBe("align");

    expect(deriveExoDockState({
      gpsActive:true,
      arrived:false,
      remainingMeters:25
    })).toBe("dock");
  });

  it("provides localized labels and calmer final camera",()=>{
    expect(exoDockLabel("align","es")).toBe("ALINEAR");
    expect(exoDockLabel("align","en")).toBe("ALIGN");
    expect(exoDockCameraProfile("dock","driving")).toMatchObject({
      pitch:0,
      zoom:18.35
    });
  });
});
