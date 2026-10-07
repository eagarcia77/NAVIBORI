"use client";

import { useEffect, useState } from "react";
import { resolveNaviIntent } from "@/lib/innovation/navi-orchestrator";
import { resolveNaviHalo } from "@/lib/innovation/navi-halo";
import { resolveNaviPresentation } from "@/lib/innovation/navi-morphing";
import type { PrimaryInteraction } from "@/lib/interaction/peripheral-profile";

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

const pilotContext = {
  verifiedSpatialData: false,
  publishedRouteGraph: false,
  accessibilityMetadata: false,
  xrCapable: false,
  xrConsent: false,
  publishedPortalIds: [],
  temporalHistoryAvailable: false
};

function readInput(): PrimaryInteraction {
  const value = document.documentElement.dataset.input;
  if (
    value === "touch" ||
    value === "pointer" ||
    value === "pen" ||
    value === "gamepad" ||
    value === "xr" ||
    value === "keyboard"
  ) {
    return value;
  }
  return "pointer";
}

export default function NaviGuide({ mode }: { mode: NaviGuideMode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(copy[mode].body);
  const [input, setInput] = useState<PrimaryInteraction>("pointer");
  const content = copy[mode];

  useEffect(() => {
    const update = () => setInput(readInput());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-input", "data-motion"]
    });
    return () => observer.disconnect();
  }, []);

  const halo = resolveNaviHalo({
    verifiedSpatialData: false,
    predictionActive: false,
    xenoMode: mode === "xeno",
    blocked: false
  });

  const presentation = resolveNaviPresentation({
    input,
    reducedMotion: document?.documentElement?.dataset?.motion === "reduced",
    audioAvailable: typeof window !== "undefined" && "speechSynthesis" in window,
    hapticsAvailable: typeof navigator !== "undefined" && "vibrate" in navigator,
    xrCapable: input === "xr"
  });

  function explainState() {
    const decision = resolveNaviIntent({ type: "explain_state" }, pilotContext);
    setMessage(decision.message);
  }

  function explore() {
    const decision = resolveNaviIntent({ type: "discover" }, pilotContext);
    setMessage(decision.message);
  }

  return (
    <aside
      className={"navi-guide halo-" + halo.state + " navi-" + presentation + " " + (open ? "open" : "")}
      aria-label="Navi, guía oficial de NAVIBORI"
    >
      <button
        type="button"
        className="navi-guide-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img src="/brand/navi-coqui.webp" alt="" aria-hidden="true" />
        <span>
          <strong>Navi</strong>
          <small>{halo.label} · {presentation}</small>
        </span>
      </button>

      {open && (
        <div className="navi-guide-panel">
          <img
            src="/brand/navi-coqui.webp"
            alt="Navi, la mascota coquí tecnológica de NAVIBORI"
          />
          <div>
            <p className="eyebrow">NAVIBORI COQUÍ GUIDE · {halo.state.toUpperCase()}</p>
            <h2>{content.title}</h2>
            <p role="status">{message}</p>
            <div className="navi-guide-actions">
              <button type="button" onClick={explore}>Explorar</button>
              <button type="button" onClick={explainState}>Explicar estado</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
