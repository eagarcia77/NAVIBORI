"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

const JUANA_DIAZ: [number, number] = [-66.506, 18.052];

export default function NaviboriMap() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapNode.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: JUANA_DIAZ,
      zoom: 13.5,
      attributionControl: true
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
      "<strong>Juana Díaz Pilot</strong><br/>Spatial venue data will replace this pilot marker once the verified Mercado Metropolitano floor plan is loaded."
    );

    new maplibregl.Marker({ color: "#FF7A59" })
      .setLngLat(JUANA_DIAZ)
      .setPopup(popup)
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section className="map-panel" aria-label="Mapa interactivo de NAVIBORI">
      <div className="map-toolbar" aria-label="Categorías del mapa">
        <button type="button" className="selected">Todos</button>
        <button type="button">Gastronomía</button>
        <button type="button">Compras</button>
        <button type="button">Eventos</button>
        <button type="button">Servicios</button>
        <button type="button">Accesibilidad</button>
      </div>
      <div ref={mapNode} className="map-canvas" />
      <aside className="status-card" aria-live="polite">
        <strong>Juana Díaz · Pilot 001</strong>
        <span>Mapa base activo · Plano interior pendiente de levantamiento validado</span>
      </aside>
    </section>
  );
}
