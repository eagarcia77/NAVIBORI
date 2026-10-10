"use client";

import { useMemo, useState } from "react";

type PublishStatus = "draft" | "published";
type EntityType = "space" | "poi" | "route-node" | "route-edge" | "anchor";

interface StudioEntity {
  id: string;
  type: EntityType;
  name: string;
  floor: string;
  status: PublishStatus;
  provenance: string;
}

const DEMO_ENTITIES: StudioEntity[] = [
  { id: "demo-space-01", type: "space", name: "Espacio demo A", floor: "Nivel 1", status: "draft", provenance: "Demo — no corresponde a un espacio real" },
  { id: "demo-poi-01", type: "poi", name: "POI demo", floor: "Nivel 1", status: "draft", provenance: "Demo — no corresponde a un POI real" },
  { id: "demo-anchor-01", type: "anchor", name: "QR anchor demo", floor: "Nivel 1", status: "draft", provenance: "Demo — no instalado físicamente" }
];

export default function StudioWorkspace() {
  const [entities, setEntities] = useState(DEMO_ENTITIES);
  const [selectedId, setSelectedId] = useState(DEMO_ENTITIES[0].id);
  const [filter, setFilter] = useState<EntityType | "all">("all");

  const visible = useMemo(
    () => entities.filter((entity) => filter === "all" || entity.type === filter),
    [entities, filter]
  );

  const selected = entities.find((entity) => entity.id === selectedId);

  function setStatus(id: string, status: PublishStatus) {
    setEntities((current) => current.map((entity) => (
      entity.id === id ? { ...entity, status } : entity
    )));
  }

  return (
    <section className="studio-grid" aria-label="Editor espacial">
      <aside className="studio-panel studio-sidebar">
        <h2>Capas</h2>
        <div className="studio-filter-list" role="group" aria-label="Filtrar entidades">
          {(["all","space","poi","route-node","route-edge","anchor"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "Todas" : value}
            </button>
          ))}
        </div>

        <h2>Elementos</h2>
        <div className="studio-entity-list">
          {visible.map((entity) => (
            <button
              key={entity.id}
              type="button"
              className={selectedId === entity.id ? "entity selected" : "entity"}
              onClick={() => setSelectedId(entity.id)}
            >
              <strong>{entity.name}</strong>
              <span>{entity.type} · {entity.status}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="studio-canvas-panel" aria-label="Lienzo espacial">
        <div className="studio-canvas-toolbar">
          <button type="button">Seleccionar</button>
          <button type="button">Añadir espacio</button>
          <button type="button">Añadir POI</button>
          <button type="button">Añadir nodo</button>
          <button type="button">Conectar ruta</button>
          <button type="button">Añadir QR</button>
        </div>

        <div className="studio-canvas" role="img" aria-label="Lienzo de demostración sin plano real cargado">
          <div className="studio-empty-state">
            <strong>No hay plano validado cargado</strong>
            <p>Este lienzo no representa la distribución real del Mercado Metropolitano.</p>
            <p>Cargaremos geometría solo después de verificar una fuente autorizada.</p>
          </div>
        </div>
      </section>

      <aside className="studio-panel studio-inspector">
        <h2>Inspector</h2>
        {selected ? (
          <>
            <dl className="studio-details">
              <div><dt>Nombre</dt><dd>{selected.name}</dd></div>
              <div><dt>Tipo</dt><dd>{selected.type}</dd></div>
              <div><dt>Piso</dt><dd>{selected.floor}</dd></div>
              <div><dt>Estado</dt><dd>{selected.status}</dd></div>
              <div><dt>Procedencia</dt><dd>{selected.provenance}</dd></div>
            </dl>

            <div className="studio-actions">
              <button type="button" onClick={() => setStatus(selected.id, "draft")}>Marcar draft</button>
              <button
                type="button"
                className="primary"
                onClick={() => setStatus(selected.id, "published")}
                disabled={selected.provenance.startsWith("Demo")}
                title={selected.provenance.startsWith("Demo") ? "Los datos demo no pueden publicarse" : undefined}
              >
                Publicar
              </button>
            </div>

            {selected.provenance.startsWith("Demo") && (
              <p className="studio-warning" role="status">
                Publicación bloqueada: el elemento no tiene procedencia validada.
              </p>
            )}
          </>
        ) : <p>Selecciona un elemento.</p>}
      </aside>
    </section>
  );
}
