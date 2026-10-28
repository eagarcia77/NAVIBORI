export interface ContinuityCapabilities {
  serviceWorker: boolean;
  backgroundSync: boolean;
  broadcastChannel: boolean;
  webRtc: boolean;
  webTransport: boolean;
  webCodecs: boolean;
  webBluetooth: boolean;
  webShare: boolean;
  online: boolean;
}

type ServiceWorkerRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: unknown;
};

export function detectContinuityCapabilities(): ContinuityCapabilities {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      serviceWorker: false,
      backgroundSync: false,
      broadcastChannel: false,
      webRtc: false,
      webTransport: false,
      webCodecs: false,
      webBluetooth: false,
      webShare: false,
      online: false
    };
  }

  const nav = navigator as Navigator & {
    bluetooth?: unknown;
  };

  const win = window as Window & {
    WebTransport?: unknown;
    VideoEncoder?: unknown;
    AudioEncoder?: unknown;
    RTCPeerConnection?: unknown;
    BroadcastChannel?: unknown;
  };

  let backgroundSync = false;
  if ("serviceWorker" in navigator) {
    const proto = window.ServiceWorkerRegistration?.prototype as ServiceWorkerRegistrationWithSync | undefined;
    backgroundSync = Boolean(proto && "sync" in proto);
  }

  return {
    serviceWorker: "serviceWorker" in navigator,
    backgroundSync,
    broadcastChannel: "BroadcastChannel" in window,
    webRtc: "RTCPeerConnection" in window,
    webTransport: "WebTransport" in window,
    webCodecs: "VideoEncoder" in window || "AudioEncoder" in window,
    webBluetooth: Boolean(nav.bluetooth),
    webShare: "share" in navigator,
    online: navigator.onLine
  };
}
