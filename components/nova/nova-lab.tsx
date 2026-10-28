"use client";

import { useEffect, useState } from "react";
import { novaModules } from "@/lib/innovation/nova-registry";
import { detectContinuityCapabilities, type ContinuityCapabilities } from "@/lib/innovation/continuity-capabilities";
import {
  detectNovaDeviceCapabilities,
  type NovaDeviceCapabilities
} from "@/lib/innovation/device-capabilities";

const emptyCapabilities: NovaDeviceCapabilities = {
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

export default function NovaLab() {
  const [caps, setCaps] = useState<NovaDeviceCapabilities>(emptyCapabilities);
  const [continuity, setContinuity] = useState<ContinuityCapabilities>({
    serviceWorker: false,
    backgroundSync: false,
    broadcastChannel: false,
    webRtc: false,
    webTransport: false,
    webCodecs: false,
    webBluetooth: false,
    webShare: false,
    online: false
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void detectNovaDeviceCapabilities().then((result) => {
      if (!active) return;
      setCaps(result);
      setContinuity(detectContinuityCapabilities());
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const capabilities = [
    ["HTTPS secure context", caps.secureContext],
    ["WebXR", caps.webXr],
    ["Immersive AR", caps.immersiveAr],
    ["Immersive VR", caps.immersiveVr],
    ["WebGPU", caps.webGpu],
    ["WebNN", caps.webNn],
    ["Web NFC", caps.webNfc],
    ["Geolocation API", caps.geolocation],
    ["Device orientation", caps.orientation],
    ["Motion sensors", caps.motion],
    ["Vibration", caps.vibration],
    ["Web Share", caps.share],
    ["XR Anchors surface", caps.xrAnchorsSurface],
    ["XR Hit Test surface", caps.xrHitTestSurface],
    ["XR Depth surface", caps.xrDepthSurface],
    ["XR Lighting surface", caps.xrLightEstimationSurface]
  ] as const;

  return (
    <>
      <section className="nova-panel" aria-labelledby="nova-device-title">
        <div className="nova-heading-row">
          <div>
            <p className="eyebrow">REALITY CHECK</p>
            <h2 id="nova-device-title">Device Reality Scanner</h2>
          </div>
          <span className="nova-scan-state">{ready ? "SCAN COMPLETE" : "SCANNING…"}</span>
        </div>
        <p>
          Detección local y progresiva. No solicita ubicación, cámara, NFC, Bluetooth,
          micrófono ni sensores; únicamente verifica superficies de API disponibles.
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

      <section className="nova-panel" aria-labelledby="nova-os-title">
        <p className="eyebrow">SPATIAL INTELLIGENCE OS</p>
        <h2 id="nova-os-title">SEE → THINK → PREDICT → PROJECT → REMEMBER</h2>
        <div className="nova-os-grid">
          <article><strong>SEE</strong><span>sensores, anchors, mapa, observaciones</span></article>
          <article><strong>THINK</strong><span>semántica, intención, accesibilidad, contexto</span></article>
          <article><strong>PREDICT</strong><span>flujo, congestión, escenarios y planificación</span></article>
          <article><strong>PROJECT</strong><span>2D, Twin, AR, VR, audio y portales</span></article>
          <article><strong>REMEMBER</strong><span>revisiones, procedencia, cambios y memoria espacial</span></article>
        </div>
      </section>

      <section className="nova-panel" aria-labelledby="continuity-title">
        <p className="eyebrow">CONTINUITY FABRIC</p>
        <h2 id="continuity-title">Una experiencia que sobrevive al cambio de red, dispositivo y realidad.</h2>
        <div className="nova-cap-grid">
          {[
            ["Service Worker", continuity.serviceWorker],
            ["Background Sync", continuity.backgroundSync],
            ["Broadcast Channel", continuity.broadcastChannel],
            ["WebRTC P2P", continuity.webRtc],
            ["WebTransport HTTP/3", continuity.webTransport],
            ["WebCodecs", continuity.webCodecs],
            ["Web Bluetooth", continuity.webBluetooth],
            ["Web Share", continuity.webShare],
            ["Online", continuity.online]
          ].map(([label, available]) => (
            <article className="nova-cap" key={String(label)}>
              <span aria-hidden="true">{available ? "●" : "○"}</span>
              <strong>{label}</strong>
              <small>{available ? "detectado" : "fallback requerido"}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="nova-panel" aria-labelledby="firewall-title">
        <p className="eyebrow">REALITY FIREWALL</p>
        <h2 id="firewall-title">La IA propone acciones; NAVIBORI decide si pueden ejecutarse.</h2>
        <div className="nova-os-grid">
          <article><strong>1</strong><span>Validar tipo de comando</span></article>
          <article><strong>2</strong><span>Validar entidad publicada</span></article>
          <article><strong>3</strong><span>Validar permisos y consentimiento</span></article>
          <article><strong>4</strong><span>Clasificar riesgo/safety</span></article>
          <article><strong>5</strong><span>Confirmar y ejecutar o bloquear</span></article>
        </div>
      </section>

      <section className="nova-panel" aria-labelledby="nova-modules-title">
        <h2 id="nova-modules-title">NOVA Engines</h2>
        <p>
          “Ready” indica que la arquitectura puede construirse hoy; no significa que existan
          datos oficiales o hardware compatible en el piloto.
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
        <p className="eyebrow">PRIME DIRECTIVE</p>
        <h2>Innovación extrema, verdad espacial primero.</h2>
        <p>
          Ningún experimento NOVA puede fabricar geometría oficial, rutas de emergencia,
          accesibilidad, ocupación o condiciones operacionales. Lo extraordinario sigue
          subordinado a datos verificables, consentimiento, accesibilidad y fallback.
        </p>
      </section>
    </>
  );
}
