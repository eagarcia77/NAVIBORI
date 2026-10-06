"use client";

import { useState } from "react";

export type NaviGuideMode = "cockpit" | "nova" | "xeno";

const copy: Record<NaviGuideMode, { title: string; body: string }> = {
  cockpit: {
    title: "Navi · Coquí Guide",
    body: "Puedo ayudarte a explorar, cambiar de realidad y explicar qué datos están verificados."
  },
  nova: {
    title: "Navi · NOVA Guide",
    body: "Estoy observando capacidades del dispositivo sin activar sensores ni pedir ubicación."
  },
  xeno: {
    title: "Navi · XENO Guide",
    body: "Exploro tecnología de frontera, pero nunca presento predicción o investigación como realidad física."
  }
};

export default function NaviGuide({ mode }: { mode: NaviGuideMode }) {
  const [open, setOpen] = useState(false);
  const content = copy[mode];

  return (
    <aside className={"navi-guide " + (open ? "open" : "")} aria-label="Navi, guía oficial de NAVIBORI">
      <button
        type="button"
        className="navi-guide-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img src="/brand/navi-coqui.webp" alt="" aria-hidden="true" />
        <span>
          <strong>Navi</strong>
          <small>Coquí Guide</small>
        </span>
      </button>

      {open && (
        <div className="navi-guide-panel">
          <img
            src="/brand/navi-coqui.webp"
            alt="Navi, la mascota coquí tecnológica de NAVIBORI"
          />
          <div>
            <p className="eyebrow">NAVIBORI COQUÍ GUIDE</p>
            <h2>{content.title}</h2>
            <p>{content.body}</p>
            <div className="navi-guide-actions">
              <button type="button">Explorar</button>
              <button type="button">Explicar estado</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
