"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { validateGeoJson, type GeoJsonValidationResult } from "@/lib/spatial/geojson";

type StoredGeoJson = Record<string, unknown>;

function toSupabaseJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export default function BackendGeoJsonImporter({ venueId }: { venueId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [result, setResult] = useState<GeoJsonValidationResult | null>(null);
  const [geoJson, setGeoJson] = useState<StoredGeoJson | null>(null);
  const [fileName, setFileName] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setMessage("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as StoredGeoJson;
      const validation = validateGeoJson(parsed);
      setGeoJson(validation.valid ? parsed : null);
      setResult(validation);
    } catch {
      setGeoJson(null);
      setResult({
        valid: false,
        errors: ["El archivo no contiene JSON válido."],
        warnings: [],
        featureCount: 0
      });
    }
  }

  async function saveDraft() {
    if (!geoJson || !result?.valid || !sourceLabel.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      const entityId = crypto.randomUUID();
      const { data, error } = await supabase.rpc("create_spatial_revision", {
        p_venue_id: venueId,
        p_entity_id: entityId,
        p_entity_type: "asset",
        p_source_label: sourceLabel.trim(),
        p_payload: toSupabaseJson({
          kind: "geojson_import",
          file_name: fileName,
          validation: {
            feature_count: result.featureCount,
            warnings: result.warnings
          },
          geojson: geoJson
        })
      });

      if (error) throw error;
      setMessage(
        `Draft creado: revisión ${data.revision_number}. El archivo todavía NO está publicado.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="studio-importer" aria-labelledby="backend-geojson-title">
      <h2 id="backend-geojson-title">Importar GeoJSON a revisión</h2>
      <p>
        Valida localmente y guarda el archivo como un draft auditado. La geometría no entra
        al mapa público hasta completar revisión y publicación.
      </p>

      <label className="file-picker">
        <span>Seleccionar .geojson o .json</span>
        <input
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>

      <label className="studio-field">
        <span>Fuente / procedencia</span>
        <input
          value={sourceLabel}
          onChange={(event) => setSourceLabel(event.target.value)}
          placeholder="Ej. Plano oficial provisto por..."
          required
        />
      </label>

      {fileName && <p className="xr-note">Archivo: {fileName}</p>}

      {result && (
        <div className={result.valid ? "import-result valid" : "import-result invalid"}>
          <strong>{result.valid ? "Estructura válida" : "Importación bloqueada"}</strong>
          <p>{result.featureCount} feature(s) detectados.</p>
          {result.errors.length > 0 && <ul>{result.errors.map((item) => <li key={item}>{item}</li>)}</ul>}
          {result.warnings.length > 0 && <ul>{result.warnings.map((item) => <li key={item}>{item}</li>)}</ul>}
          <button
            type="button"
            disabled={!result.valid || !geoJson || !sourceLabel.trim() || saving}
            onClick={saveDraft}
          >
            {saving ? "Guardando…" : "Crear draft en Supabase"}
          </button>
        </div>
      )}

      {message && <p className="studio-warning" role="status">{message}</p>}
    </section>
  );
}
