"use client";

import { useMemo, useState } from "react";
import { buildSpatialEnergyState, type SpatialEnergyChannel } from "@/lib/innovation/spatial-energy";

const labels: Record<SpatialEnergyChannel, string> = {
  event: "Event",
  accessibility: "Access",
  culture: "Culture",
  operations: "Ops",
  prediction: "Predict"
};

export default function RealityLens() {
  const [open, setOpen] = useState(false);

  const state = useMemo(() => buildSpatialEnergyState({
    publishedEvent: false,
    publishedAccessibility: false,
    publishedCulture: false,
    publishedOperations: false,
    approvedPrediction: false
  }), []);

  return (
    <aside className={"reality-lens " + (open ? "open" : "")} aria-label="Reality Lens">
      <button
        type="button"
        className="reality-lens-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">◉</span>
        Reality Lens
      </button>

      {open && (
        <div className="reality-lens-panel">
          <div className="reality-lens-head">
            <div>
              <span>XENO SPATIAL ENERGY</span>
              <strong>{state.activeCount} active channels</strong>
            </div>
            <small>truth-aware</small>
          </div>

          <div className="reality-lens-channels">
            {state.channels.map((item) => (
              <div key={item.channel} className={item.available ? "available" : "blocked"}>
                <span className="lens-dot" aria-hidden="true" />
                <strong>{labels[item.channel]}</strong>
                <small>{item.available ? (item.factual ? "factual" : "predictive") : "locked"}</small>
              </div>
            ))}
          </div>

          <p>
            No hay capas espaciales publicadas todavía para el Pilot 001. NAVIBORI no dibuja
            actividad, accesibilidad, cultura ni predicción hasta que existan datos aprobados.
          </p>
        </div>
      )}
    </aside>
  );
}
