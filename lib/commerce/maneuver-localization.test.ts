import {describe,expect,it} from "vitest";
import {localizeManeuver} from "./maneuver-localization";

describe("navigation maneuver localization",()=>{
 it("translates right turn while preserving road name",()=>expect(localizeManeuver("Turn right onto PR-510","es")).toBe("Gira a la derecha en PR-510"));
 it("translates left turn",()=>expect(localizeManeuver("Turn left onto Calle Cedro","es")).toBe("Gira a la izquierda en Calle Cedro"));
 it("preserves English when selected",()=>expect(localizeManeuver("Turn right onto PR-510","en")).toBe("Turn right onto PR-510"));
 it("preserves roundabout exit ordinal",()=>expect(localizeManeuver("At the roundabout, take the second exit onto PR-14","es")).toBe("En la rotonda, toma la segunda salida hacia PR-14"));
 it("translates merge",()=>expect(localizeManeuver("Merge onto PR-52","es")).toBe("Incorpórate a PR-52"));
 it("translates slight-left merging without losing road name",()=>expect(localizeManeuver("Merge slightly left onto Autopista Luis A. Ferré","es")).toBe("Incorpórate ligeramente a la izquierda en Autopista Luis A. Ferré"));
 it("translates slight-right merging",()=>expect(localizeManeuver("Merge slightly right onto PR-52","es")).toBe("Incorpórate ligeramente a la derecha en PR-52"));
 it("preserves unknown instructions",()=>expect(localizeManeuver("Unknown instruction","es")).toBe("Unknown instruction"));
});
