"use client";

import { useEffect, useState } from "react";
import { detectXrCapabilities, type XrCapabilities } from "@/lib/xr/capabilities";

const initial: XrCapabilities = {
  secureContext: false,
  webXrAvailable: false,
  immersiveAr: false,
  immersiveVr: false,
  cameraApiAvailable: false
};

export default function XrCapabilityCard({ mode }: { mode: "AR" | "VR" }) {
  const [capabilities, setCapabilities] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    detectXrCapabilities().then((result) => {
      setCapabilities(result);
      setReady(true);
    });
  }, []);

  const supported = mode === "AR" ? capabilities.immersiveAr : capabilities.immersiveVr;

  return (
    <section className="xr-card" aria-live="polite">
      <h2>Compatibilidad del dispositivo</h2>
      {!ready ? (
        <p>Verificando capacidades...</p>
      ) : (
        <>
          <dl className="xr-capability-list">
            <div><dt>HTTPS / contexto seguro</dt><dd>{capabilities.secureContext ? "Disponible" : "No disponible"}</dd></div>
            <div><dt>WebXR</dt><dd>{capabilities.webXrAvailable ? "Disponible" : "No disponible"}</dd></div>
            <div><dt>Cámara web</dt><dd>{capabilities.cameraApiAvailable ? "Disponible" : "No disponible"}</dd></div>
            <div><dt>{mode} inmersivo</dt><dd>{supported ? "Compatible" : "No detectado"}</dd></div>
          </dl>
          <p className="xr-note">
            {supported
              ? mode + " inmersivo está disponible en este dispositivo."
              : mode + " inmersivo no está disponible o no puede confirmarse. NAVIBORI mantendrá una alternativa no inmersiva."}
          </p>
        </>
      )}
    </section>
  );
}
