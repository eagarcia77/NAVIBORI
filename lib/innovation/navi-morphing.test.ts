import { describe, expect, it } from "vitest";
import { resolveNaviPresentation } from "./navi-morphing";

describe("Navi Morphing", () => {
  it("uses XR avatar only in XR-capable XR input mode", () => {
    expect(resolveNaviPresentation({
      input: "xr",
      reducedMotion: false,
      audioAvailable: true,
      hapticsAvailable: true,
      xrCapable: true
    })).toBe("xr-avatar");
  });

  it("uses compact visual mode for touch", () => {
    expect(resolveNaviPresentation({
      input: "touch",
      reducedMotion: false,
      audioAvailable: true,
      hapticsAvailable: false,
      xrCapable: false
    })).toBe("compact-visual");
  });

  it("uses haptic-ready mode for gamepad with haptics", () => {
    expect(resolveNaviPresentation({
      input: "gamepad",
      reducedMotion: false,
      audioAvailable: true,
      hapticsAvailable: true,
      xrCapable: false
    })).toBe("haptic-ready");
  });
});
