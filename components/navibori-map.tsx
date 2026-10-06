"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import RealityIntensityControl from "@/components/cockpit/reality-intensity";

const JUANA_DIAZ_REFERENCE: [number, number] = [-66.506, 18.052];

type RealityMode = "2d" | "globe" | "time";

export default function NaviboriMap() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mode, setMode] = useState<RealityMode>("2d");
  const [timeOpen, setTimeOpen] = useState(false);
  const [basemapState, setBasemapState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapNode.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [
          {
            id: "osm-raster",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 20
          }
        ]
      },
      center: JUANA_DIAZ_REFERENCE,
      zoom: 13.5,
      canvasContextAttributes: { antialias: true }
    });

    map.on("load", () => setBasemapState("ready"));
    map.on("error", (event) => {
      if (event?.error) setBasemapState("error");
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    if ("GlobeControl" in maplibregl) {
      map.addControl(new maplibregl.GlobeControl(), "top-right");
    }

    const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
      "<strong>Juana Díaz · Pilot 001</strong><br/>Punto de referencia municipal. La ubicación exacta del Mercado y su geometría interior se publicarán únicamente cuando hayan sido verificadas."
    );

    new maplibregl.Marker({ color: "#FF7A59" })
      .setLngLat(JUANA_DIAZ_REFERENCE)
      .setPopup(popup)
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function activateMapMode(next: RealityMode) {
    const map = mapRef.current;
    if (!map) return;

    if (next === "globe") {
      map.setProjection({ type: "globe" });
      map.easeTo({ zoom: Math.min(map.getZoom(), 8), duration: 900 });
    } else {
      map.setProjection({ type: "mercator" });
      if (mode === "globe") {
        map.easeTo({ center: JUANA_DIAZ_REFERENCE, zoom: 13.5, duration: 900 });
      }
    }

    setMode(next);
    setTimeOpen(next === "time");
  }

  return (
    <section className="map-panel spatial-cockpit" aria-label="Spatial Cockpit de NAVIBORI">
      <div className="cockpit-topline">
        <div className="reality-mode-switch" role="group" aria-label="Modo de realidad">
          <button
            type="button"
            className={mode === "2d" ? "active" : ""}
            onClick={() => activateMapMode("2d")}
          >
            2D
          </button>
          <button
            type="button"
            className={mode === "globe" ? "active" : ""}
            onClick={() => activateMapMode("globe")}
          >
            Globe
          </button>
          <Link href="/twin">Twin</Link>
          <Link href="/ar">AR</Link>
          <button
            type="button"
            className={mode === "time" ? "active" : ""}
            onClick={() => activateMapMode("time")}
          >
            Time
          </button>
        </div>

        <div className="cockpit-signal" aria-label="Estado de verdad espacial">
          <span className="cockpit-pulse" aria-hidden="true" />
          <strong>Spatial Truth</strong>
          <span>
            {basemapState === "ready"
              ? "Basemap online · verified interior pending"
              : basemapState === "error"
                ? "Basemap degraded · retry/network check"
                : "Basemap loading…"}
          </span>
        </div>
      </div>

      <div className="map-toolbar" aria-label="Categorías del mapa">
        <button type="button" className="selected">Todos</button>
        <button type="button">Gastronomía</button>
        <button type="button">Compras</button>
        <button type="button">Eventos</button>
        <button type="button">Servicios</button>
        <button type="button">Accesibilidad</button>
      </div>

      <div className="map-stage">
        <div ref={mapNode} className="map-canvas" />

        <aside className="cockpit-hud" aria-label="HUD espacial">
          <div>
            <span>POSITION</span>
            <strong>Municipal reference</strong>
          </div>
          <div>
            <span>INDOOR</span>
            <strong>Awaiting validated survey</strong>
          </div>
          <div>
            <span>ROUTING</span>
            <strong>Exterior shell only</strong>
          </div>
        </aside>

        {timeOpen && (
          <aside className="time-machine-panel" aria-live="polite">
            <p className="eyebrow">TEMPORAL TWIN</p>
            <strong>Time Machine preparado</strong>
            <span>
              Se habilitará cuando existan estados espaciales publicados con historial temporal.
              No se simulará el pasado o futuro como si fuera un hecho.
            </span>
          </aside>
        )}

        <RealityIntensityControl />

        <aside className="status-card" aria-live="polite">
          <strong>Juana Díaz · Pilot 001</strong>
          <span>Basemap activo · punto de referencia no equivale a coordenada oficial del Mercado</span>
        </aside>
      </div>
    </section>
  );
}
