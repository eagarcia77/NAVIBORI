import type { PrimaryInteraction } from "@/lib/interaction/peripheral-profile";

export type NaviPresentation =
  | "visual"
  | "compact-visual"
  | "spatial-audio"
  | "haptic-ready"
  | "xr-avatar";

export interface NaviMorphingContext {
  input: PrimaryInteraction;
  reducedMotion: boolean;
  audioAvailable: boolean;
  hapticsAvailable: boolean;
  xrCapable: boolean;
}

export function resolveNaviPresentation(
  context: NaviMorphingContext
): NaviPresentation {
  if (context.xrCapable && context.input === "xr") {
    return "xr-avatar";
  }

  if (context.input === "gamepad" && context.hapticsAvailable) {
    return "haptic-ready";
  }

  if (context.input === "keyboard" && context.audioAvailable) {
    return "spatial-audio";
  }

  if (context.reducedMotion || context.input === "touch") {
    return "compact-visual";
  }

  return "visual";
}
