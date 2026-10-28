export interface NovaDeviceCapabilities {
  secureContext: boolean;
  webXr: boolean;
  immersiveAr: boolean;
  immersiveVr: boolean;
  webGpu: boolean;
  webNn: boolean;
  webNfc: boolean;
  geolocation: boolean;
  orientation: boolean;
  motion: boolean;
  vibration: boolean;
  share: boolean;
  xrAnchorsSurface: boolean;
  xrHitTestSurface: boolean;
  xrDepthSurface: boolean;
  xrLightEstimationSurface: boolean;
}

type XrSystemLike = {
  isSessionSupported(mode: "immersive-ar" | "immersive-vr"): Promise<boolean>;
};

export async function detectNovaDeviceCapabilities(): Promise<NovaDeviceCapabilities> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      secureContext: false,
      webXr: false,
      immersiveAr: false,
      immersiveVr: false,
      webGpu: false,
      webNn: false,
      webNfc: false,
      geolocation: false,
      orientation: false,
      motion: false,
      vibration: false,
      share: false,
      xrAnchorsSurface: false,
      xrHitTestSurface: false,
      xrDepthSurface: false,
      xrLightEstimationSurface: false
    };
  }

  const nav = navigator as Navigator & { xr?: XrSystemLike; gpu?: unknown; ml?: unknown };
  const win = window as Window & {
    NDEFReader?: unknown;
    XRAnchor?: unknown;
    XRHitTestResult?: unknown;
    XRDepthInformation?: unknown;
    XRLightEstimate?: unknown;
  };

  let immersiveAr = false;
  let immersiveVr = false;

  if (nav.xr) {
    try {
      [immersiveAr, immersiveVr] = await Promise.all([
        nav.xr.isSessionSupported("immersive-ar"),
        nav.xr.isSessionSupported("immersive-vr")
      ]);
    } catch {
      immersiveAr = false;
      immersiveVr = false;
    }
  }

  return {
    secureContext: window.isSecureContext,
    webXr: Boolean(nav.xr),
    immersiveAr,
    immersiveVr,
    webGpu: Boolean(nav.gpu),
    webNn: Boolean(nav.ml),
    webNfc: Boolean(win.NDEFReader),
    geolocation: "geolocation" in navigator,
    orientation: "DeviceOrientationEvent" in window,
    motion: "DeviceMotionEvent" in window,
    vibration: "vibrate" in navigator,
    share: "share" in navigator,
    xrAnchorsSurface: Boolean(win.XRAnchor),
    xrHitTestSurface: Boolean(win.XRHitTestResult),
    xrDepthSurface: Boolean(win.XRDepthInformation),
    xrLightEstimationSurface: Boolean(win.XRLightEstimate)
  };
}
