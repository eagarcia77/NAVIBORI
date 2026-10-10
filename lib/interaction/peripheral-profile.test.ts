import { describe, expect, it } from "vitest";
import { resolvePeripheralProfile } from "./peripheral-profile";

describe("Adaptive Peripheral Profile", () => {
  it("prefers touch-sized controls for coarse pointers", () => {
    const profile = resolvePeripheralProfile({
      coarsePointer: true,
      finePointer: false,
      hover: false,
      maxTouchPoints: 5,
      gamepadConnected: false,
      xrCapable: false,
      penObserved: false,
      reducedMotion: false,
      compactViewport: true
    });
    expect(profile.primary).toBe("touch");
    expect(profile.controlSize).toBe("comfortable");
  });

  it("uses compact controls for fine mouse-like pointers", () => {
    const profile = resolvePeripheralProfile({
      coarsePointer: false,
      finePointer: true,
      hover: true,
      maxTouchPoints: 0,
      gamepadConnected: false,
      xrCapable: false,
      penObserved: false,
      reducedMotion: false,
      compactViewport: false
    });
    expect(profile.primary).toBe("pointer");
    expect(profile.controlSize).toBe("compact");
  });

  it("keeps reduced-motion preference across peripherals", () => {
    const profile = resolvePeripheralProfile({
      coarsePointer: false,
      finePointer: false,
      hover: false,
      maxTouchPoints: 0,
      gamepadConnected: true,
      xrCapable: false,
      penObserved: false,
      reducedMotion: true,
      compactViewport: false
    });
    expect(profile.primary).toBe("gamepad");
    expect(profile.reducedMotion).toBe(true);
  });
});
