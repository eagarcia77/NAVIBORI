export interface XrCapabilities {
  secureContext: boolean;
  webXrAvailable: boolean;
  immersiveAr: boolean;
  immersiveVr: boolean;
  cameraApiAvailable: boolean;
}

interface XrNavigator extends Navigator {
  xr?: {
    isSessionSupported(mode: "immersive-ar" | "immersive-vr"): Promise<boolean>;
  };
}

export async function detectXrCapabilities(): Promise<XrCapabilities> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      secureContext: false,
      webXrAvailable: false,
      immersiveAr: false,
      immersiveVr: false,
      cameraApiAvailable: false
    };
  }

  const xrNavigator = navigator as XrNavigator;
  const webXrAvailable = Boolean(xrNavigator.xr);

  let immersiveAr = false;
  let immersiveVr = false;

  if (xrNavigator.xr) {
    try {
      [immersiveAr, immersiveVr] = await Promise.all([
        xrNavigator.xr.isSessionSupported("immersive-ar"),
        xrNavigator.xr.isSessionSupported("immersive-vr")
      ]);
    } catch {
      immersiveAr = false;
      immersiveVr = false;
    }
  }

  return {
    secureContext: window.isSecureContext,
    webXrAvailable,
    immersiveAr,
    immersiveVr,
    cameraApiAvailable: Boolean(navigator.mediaDevices?.getUserMedia)
  };
}
