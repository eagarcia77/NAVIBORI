"use client";

import { useState } from "react";
import { transitionRevision, type SpatialRevision } from "@/lib/spatial/revisions";

const initial: SpatialRevision = {
  id: "demo-revision-1",
  venueId: "demo-venue",
  entityId: "demo-poi-1",
  entityType: "poi",
  revisionNumber: 1,
  status: "draft",
  sourceLabel: "Demo — no es una fuente productiva",
  createdBy: "demo-editor",
  createdAt: new Date(0).toISOString()
};

export default function RevisionPanel() {
  const [revision, setRevision] = useState(initial);
  const [message, setMessage] = useState("Flujo de demostración. No escribe datos reales.");

  function move(nextStatus: "in_review" | "approved" | "published" | "draft") {
    const result = transitionRevision(
      revision,
      nextStatus,
      "demo-user",
      new Date().toISOString()
    );

    if (!result.allowed || !result.next) {
      setMessage(result.reason ?? "La transición fue bloqueada.");
      return;
    }

    setRevision(result.next);
    setMessage("Estado actualizado localmente a " + result.next.status + ".");
  }

  return (
    <section className="studio-importer" aria-labelledby="revision-title">
      <h2 id="revision-title">Revision Workflow</h2>
      <p>Estado actual: <strong>{revision.status}</strong> · revisión {revision.revisionNumber}</p>
      <p className="xr-note">Fuente: {revision.sourceLabel}</p>
      <div className="revision-actions" role="group" aria-label="Cambiar estado de revisión">
        <button type="button" onClick={() => move("in_review")} disabled={revision.status !== "draft"}>
          Enviar a revisión
        </button>
        <button type="button" onClick={() => move("approved")} disabled={revision.status !== "in_review"}>
          Aprobar
        </button>
        <button type="button" onClick={() => move("published")} disabled={revision.status !== "approved"}>
          Publicar
        </button>
        <button type="button" onClick={() => move("draft")} disabled={!["in_review","approved"].includes(revision.status)}>
          Regresar a draft
        </button>
      </div>
      <p className="studio-warning" role="status">{message}</p>
      <p className="xr-note">
        Este panel valida el flujo lógico solamente. La publicación real requerirá permisos, RLS, auditoría y persistencia en Supabase/PostGIS.
      </p>
    </section>
  );
}
