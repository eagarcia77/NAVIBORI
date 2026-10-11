import {describe,expect,it} from "vitest";
import {
  deriveVectorGatePhase,
  vectorGateGlyph,
  vectorGateHapticPattern,
  vectorGateLabel
} from "./vector-gate";

describe("Vector Gate",()=>{
  it("progresses through maneuver distance phases",()=>{
    expect(deriveVectorGatePhase(null)).toBe("cruise");
    expect(deriveVectorGatePhase(251)).toBe("cruise");
    expect(deriveVectorGatePhase(250)).toBe("near");
    expect(deriveVectorGatePhase(75)).toBe("critical");
    expect(deriveVectorGatePhase(25)).toBe("commit");
  });

  it("provides distinct haptic patterns only near a maneuver",()=>{
    expect(vectorGateHapticPattern("cruise")).toBeNull();
    expect(vectorGateHapticPattern("near")).toBe(20);
    expect(vectorGateHapticPattern("critical")).toEqual([28,45,28]);
    expect(vectorGateHapticPattern("commit")).toEqual([42,30,42]);
  });

  it("maps maneuver modifiers to compact guidance glyphs",()=>{
    expect(vectorGateGlyph("left")).toBe("↰");
    expect(vectorGateGlyph("right")).toBe("↱");
    expect(vectorGateGlyph("straight")).toBe("↑");
    expect(vectorGateGlyph(null)).toBe("◇");
  });

  it("localizes phase labels",()=>{
    expect(vectorGateLabel("near","es")).toBe("APROXIMACIÓN");
    expect(vectorGateLabel("commit","en")).toBe("COMMIT");
  });
});
