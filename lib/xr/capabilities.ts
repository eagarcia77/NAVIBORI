export interface XrCapabilities {
  secureContext: boolean;
  webXrAvailable: boolean;
  immersiveAr: boolean;
  immersiveVr: boolean;
  cameraApiAvailable: boolean;
}

type MinimalXrSystem = {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
};

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

  const xrSystem = navigator.xr as MinimalXrSystem | undefined;
  const webXrAvailable = Boolean(xrSystem);

  let immersiveAr = false;
  let immersiveVr = false;

  if (xrSystem) {
    try {
      [immersiveAr, immersiveVr] = await Promise.all([
        xrSystem.isSessionSupported("immersive-ar"),
        xrSystem.isSessionSupported("immersive-vr")
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
