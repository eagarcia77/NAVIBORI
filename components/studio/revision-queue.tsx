"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { runSpatialPublicationAction } from "@/lib/supabase/publication";

type Revision = Tables<"spatial_revisions">;

function canSubmit(status: string, roles: string[]) {
  return status === "draft" && roles.some((role) =>
    ["platform_owner","municipality_admin","venue_manager","content_editor"].includes(role)
  );
}

function canApprove(status: string, roles: string[]) {
  return status === "in_review" && roles.some((role) =>
    ["platform_owner","municipality_admin","venue_manager"].includes(role)
  );
}

function canPublish(status: string, roles: string[]) {
  return status === "approved" && roles.some((role) =>
    ["platform_owner","municipality_admin","venue_manager"].includes(role)
  );
}

export default function RevisionQueue({
  venueId,
  roles,
  initialRevisions
}: {
  venueId: string;
  roles: string[];
  initialRevisions: Revision[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [revisions, setRevisions] = useState(initialRevisions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const { data, error } = await supabase
      .from("spatial_revisions")
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    setRevisions(data);
  }

  async function act(
    revision: Revision,
    action: "submit_spatial_revision" | "approve_spatial_revision" | "publish_spatial_revision"
  ) {
    setBusyId(revision.id);
    setMessage("");

    try {
      const result = await runSpatialPublicationAction(
        supabase,
        action,
        revision.id,
        "Acción ejecutada desde NAVIBORI Studio"
      );
      setMessage(`Revisión ${result.revisionNumber}: estado ${result.status}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La acción fue bloqueada.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="studio-importer" aria-labelledby="revision-queue-title">
      <h2 id="revision-queue-title">Revision Queue</h2>
      <p>Los botones reflejan el rol visible; Supabase vuelve a validar toda autorización.</p>

      {revisions.length === 0 ? (
        <p className="xr-note">Todavía no existen revisiones para este venue.</p>
      ) : (
        <div className="revision-list">
          {revisions.map((revision) => (
            <article className="revision-card" key={revision.id}>
              <div>
                <strong>{revision.entity_type} · revisión {revision.revision_number}</strong>
                <span className="status-chip">{revision.status}</span>
              </div>
              <p>Fuente: {revision.source_label}</p>
              <p className="xr-note">ID: {revision.entity_id}</p>

              <div className="revision-actions">
                {canSubmit(revision.status, roles) && (
                  <button
                    type="button"
                    disabled={busyId === revision.id}
                    onClick={() => act(revision, "submit_spatial_revision")}
                  >
                    Enviar a revisión
                  </button>
                )}
                {canApprove(revision.status, roles) && (
                  <button
                    type="button"
                    disabled={busyId === revision.id}
                    onClick={() => act(revision, "approve_spatial_revision")}
                  >
                    Aprobar
                  </button>
                )}
                {canPublish(revision.status, roles) && (
                  <button
                    type="button"
                    disabled={busyId === revision.id}
                    onClick={() => act(revision, "publish_spatial_revision")}
                  >
                    Publicar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {message && <p className="studio-warning" role="status">{message}</p>}
    </section>
  );
}
