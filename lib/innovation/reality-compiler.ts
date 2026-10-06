export type RealityOutputMode =
  | "map-2d"
  | "twin-3d"
  | "immersive-ar"
  | "immersive-vr"
  | "audio-guidance"
  | "reduced-motion";

export interface RealityCompileContext {
  verifiedSpatialData: boolean;
  webXr: boolean;
  immersiveAr: boolean;
  immersiveVr: boolean;
  webGpu: boolean;
  reducedMotion: boolean;
  audioAvailable: boolean;
  explicitXrConsent: boolean;
}

export interface RealityCompileResult {
  primary: RealityOutputMode;
  fallbacks: RealityOutputMode[];
  blockedReasons: string[];
}

export function compileReality(context: RealityCompileContext): RealityCompileResult {
  const blockedReasons: string[] = [];
  const fallbacks: RealityOutputMode[] = ["map-2d"];

  if (!context.verifiedSpatialData) {
    blockedReasons.push("Verified spatial data is required for route-grounded immersive modes.");
  }

  if (context.audioAvailable) fallbacks.push("audio-guidance");
  if (context.webGpu) fallbacks.push("twin-3d");
  if (context.reducedMotion) {
    return { primary: "reduced-motion", fallbacks, blockedReasons };
  }

  if (
    context.verifiedSpatialData &&
    context.webXr &&
    context.immersiveAr &&
    context.explicitXrConsent
  ) {
    return { primary: "immersive-ar", fallbacks, blockedReasons };
  }

  if (
    context.verifiedSpatialData &&
    context.webXr &&
    context.immersiveVr &&
    context.explicitXrConsent
  ) {
    return { primary: "immersive-vr", fallbacks, blockedReasons };
  }

  if (context.webGpu) {
    return { primary: "twin-3d", fallbacks, blockedReasons };
  }

  return { primary: "map-2d", fallbacks, blockedReasons };
}
