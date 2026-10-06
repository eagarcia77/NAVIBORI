"use client";

import { useEffect, useState } from "react";
import { novaModules } from "@/lib/innovation/nova-registry";

interface DeviceCapabilities {
  secureContext: boolean;
  webXr: boolean;
  immersiveAr: boolean;
  immersiveVr: boolean;
  webGpu: boolean;
  webNfc: boolean;
  geolocation: boolean;
  deviceOrientation: boolean;
  vibration: boolean;
  share: boolean;
}

const emptyCapabilities: DeviceCapabilities = {
  secureContext: false,
  webXr: false,
  immersiveAr: false,
  immersiveVr: false,
  webGpu: false,
  webNfc: false,
  geolocation: false,
  deviceOrientation: false,
  vibration: false,
  share: false
};

export default function NovaLab() {
  const [caps, setCaps] = useState<DeviceCapabilities>(emptyCapabilities);

  useEffect(() => {
    let active = true;

    async function detect() {
      const nav = navigator as Navigator & {
        xr?: { isSessionSupported(mode: "immersive-ar" | "immersive-vr"): Promise<boolean> };
        gpu?: unknown;
      };
      const win = window as Window & { NDEFReader?: unknown; DeviceOrientationEvent?: unknown };

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

      if (!active) return;
      setCaps({
        secureContext: window.isSecureContext,
        webXr: Boolean(nav.xr),
        immersiveAr,
        immersiveVr,
        webGpu: Boolean(nav.gpu),
        webNfc: Boolean(win.NDEFReader),
        geolocation: "geolocation" in navigator,
        deviceOrientation: "DeviceOrientationEvent" in window,
        vibration: "vibrate" in navigator,
        share: "share" in navigator
      });
    }

    void detect();
    return () => { active = false; };
  }, []);

  const capabilities = [
    ["HTTPS secure context", caps.secureContext],
    ["WebXR", caps.webXr],
    ["Immersive AR", caps.immersiveAr],
    ["Immersive VR", caps.immersiveVr],
    ["WebGPU", caps.webGpu],
    ["Web NFC", caps.webNfc],
    ["Geolocation API", caps.geolocation],
    ["Device orientation", caps.deviceOrientation],
    ["Vibration", caps.vibration],
    ["Web Share", caps.share]
  ] as const;

  return (
    <>
      <section className="nova-panel" aria-labelledby="nova-device-title">
        <h2 id="nova-device-title">Device Reality Scanner</h2>
        <p>
          Detección local y progresiva. No solicita ubicación, cámara, NFC ni sensores;
          solamente identifica si la superficie de API existe.
        </p>
        <div className="nova-cap-grid">
          {capabilities.map(([label, available]) => (
            <article className="nova-cap" key={label}>
              <span aria-hidden="true">{available ? "●" : "○"}</span>
              <strong>{label}</strong>
              <small>{available ? "detectado" : "no detectado"}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="nova-panel" aria-labelledby="nova-modules-title">
        <h2 id="nova-modules-title">NOVA Engines</h2>
        <p>
          Portafolio experimental. “Ready” significa que la arquitectura puede construirse
          ahora; no significa que existan datos oficiales del piloto.
        </p>
        <div className="nova-module-grid">
          {novaModules.map((module) => (
            <article className="nova-module" key={module.id}>
              <div className="nova-module-top">
                <strong>{module.name}</strong>
                <span className={"nova-maturity " + module.maturity}>{module.maturity}</span>
              </div>
              <p>{module.description}</p>
              <ul>
                <li>Datos verificados: {module.requiresVerifiedSpatialData ? "requeridos" : "no bloqueantes"}</li>
                <li>Privacidad sensible: {module.privacySensitive ? "sí" : "no"}</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="nova-panel">
        <h2>Prime Directive</h2>
        <p>
          Ningún experimento NOVA puede fabricar geometría oficial, rutas de emergencia,
          accesibilidad o condiciones operacionales. Lo extraordinario sigue subordinado
          a datos verificables, consentimiento y accesibilidad.
        </p>
      </section>
    </>
  );
}
