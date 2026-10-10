export type PrimaryInteraction =
  | "touch"
  | "pointer"
  | "pen"
  | "gamepad"
  | "xr"
  | "keyboard";

export interface PeripheralSignals {
  coarsePointer: boolean;
  finePointer: boolean;
  hover: boolean;
  maxTouchPoints: number;
  gamepadConnected: boolean;
  xrCapable: boolean;
  penObserved: boolean;
  reducedMotion: boolean;
  compactViewport: boolean;
}

export interface PeripheralProfile {
  primary: PrimaryInteraction;
  controlSize: "comfortable" | "compact";
  hoverAffordances: boolean;
  gestureFriendly: boolean;
  gamepadNavigation: boolean;
  reducedMotion: boolean;
  density: "compact" | "standard";
}

export function resolvePeripheralProfile(
  signals: PeripheralSignals
): PeripheralProfile {
  if (signals.xrCapable) {
    return {
      primary: "xr",
      controlSize: "comfortable",
      hoverAffordances: false,
      gestureFriendly: true,
      gamepadNavigation: signals.gamepadConnected,
      reducedMotion: signals.reducedMotion,
      density: "standard"
    };
  }

  if (signals.gamepadConnected && !signals.coarsePointer) {
    return {
      primary: "gamepad",
      controlSize: "comfortable",
      hoverAffordances: false,
      gestureFriendly: false,
      gamepadNavigation: true,
      reducedMotion: signals.reducedMotion,
      density: "standard"
    };
  }

  if (signals.penObserved) {
    return {
      primary: "pen",
      controlSize: "comfortable",
      hoverAffordances: signals.hover,
      gestureFriendly: true,
      gamepadNavigation: false,
      reducedMotion: signals.reducedMotion,
      density: signals.compactViewport ? "compact" : "standard"
    };
  }

  if (signals.coarsePointer || signals.maxTouchPoints > 0) {
    return {
      primary: "touch",
      controlSize: "comfortable",
      hoverAffordances: false,
      gestureFriendly: true,
      gamepadNavigation: false,
      reducedMotion: signals.reducedMotion,
      density: signals.compactViewport ? "compact" : "standard"
    };
  }

  if (signals.finePointer) {
    return {
      primary: "pointer",
      controlSize: "compact",
      hoverAffordances: signals.hover,
      gestureFriendly: false,
      gamepadNavigation: false,
      reducedMotion: signals.reducedMotion,
      density: signals.compactViewport ? "compact" : "standard"
    };
  }

  return {
    primary: "keyboard",
    controlSize: "comfortable",
    hoverAffordances: false,
    gestureFriendly: false,
    gamepadNavigation: false,
    reducedMotion: signals.reducedMotion,
    density: signals.compactViewport ? "compact" : "standard"
  };
}
