"use client";

import { useEffect, useState } from "react";
import { detectNovaDeviceCapabilities } from "@/lib/innovation/device-capabilities";
import {
  resolveRealityIntensity,
  type RealityIntensity
} from "@/lib/innovation/reality-intensity";

const levels: RealityIntensity[] = ["physical","semantic","predictive","immersive"];

export default function RealityIntensityControl() {
  const [requested, setRequested] = useState<RealityIntensity>("physical");
  const [xrCapable, setXrCapable] = useState(false);
  const [webGpu, setWebGpu] = useState(false);
  const [webNn, setWebNn] = useState(false);
  const [message, setMessage] = useState("Physical reality active.");

  useEffect(() => {
    let active = true;
    void detectNovaDeviceCapabilities().then((caps) => {
      if (!active) return;
      setXrCapable(caps.immersiveAr || caps.immersiveVr);
      setWebGpu(caps.webGpu);
      setWebNn(caps.webNn);
    });
    return () => { active = false; };
  }, []);

  function choose(level: RealityIntensity) {
    const decision = resolveRealityIntensity(level, {
      verifiedSpatialData: false,
      semanticDataAvailable: false,
      predictiveModelAvailable: false,
      immersiveCapable: xrCapable,
      immersiveConsent: false
    });

    setRequested(decision.effective);
    setMessage(
      decision.allowed
        ? level.charAt(0).toUpperCase() + level.slice(1) + " reality active."
        : decision.reason ?? "Mode unavailable."
    );
  }

  return (
    <aside className="reality-intensity" aria-labelledby="reality-intensity-title">
      <div className="reality-intensity-head">
        <div>
          <span>XENO REALITY INTENSITY</span>
          <strong id="reality-intensity-title">Reality Dial</strong>
        </div>
        <div className="xeno-local-telemetry" aria-label="Capacidades locales">
          <span className={webGpu ? "on" : ""}>GPU</span>
          <span className={webNn ? "on" : ""}>NN</span>
          <span className={xrCapable ? "on" : ""}>XR</span>
        </div>
      </div>

      <div className="reality-intensity-track" role="group" aria-label="Intensidad de realidad">
        {levels.map((level, index) => (
          <button
            key={level}
            type="button"
            className={requested === level ? "active" : ""}
            onClick={() => choose(level)}
          >
            <span>{index + 1}</span>
            {level}
          </button>
        ))}
      </div>

      <p role="status">{message}</p>
      <small>
        Este control no solicita sensores ni activa XR. Solo evalúa si el nivel podría habilitarse
        con datos, hardware y consentimiento adecuados.
      </small>
    </aside>
  );
}
