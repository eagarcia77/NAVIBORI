"use client";

import { useState } from "react";
import { validateGeoJson, type GeoJsonValidationResult } from "@/lib/spatial/geojson";

export default function GeoJsonImporter() {
  const [result, setResult] = useState<GeoJsonValidationResult | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setResult(validateGeoJson(json));
    } catch {
      setResult({
        valid: false,
        errors: ["El archivo no contiene JSON válido."],
        warnings: [],
        featureCount: 0
      });
    }
  }

  return (
    <section className="studio-importer" aria-labelledby="geojson-import-title">
      <h2 id="geojson-import-title">Importar GeoJSON</h2>
      <p>La importación valida estructura y procedencia antes de permitir una futura publicación.</p>
      <label className="file-picker">
        <span>Seleccionar archivo .geojson o .json</span>
        <input
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>

      {fileName && <p className="xr-note">Archivo: {fileName}</p>}

      {result && (
        <div className={result.valid ? "import-result valid" : "import-result invalid"} role="status">
          <strong>{result.valid ? "Estructura válida" : "Importación bloqueada"}</strong>
          <p>{result.featureCount} feature(s) detectados.</p>
          {result.errors.length > 0 && (
            <ul>{result.errors.map((error) => <li key={error}>{error}</li>)}</ul>
          )}
          {result.warnings.length > 0 && (
            <>
              <p>Advertencias:</p>
              <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </>
          )}
          <button type="button" disabled>
            Incorporar al venue
          </button>
          <p className="xr-note">La escritura real se habilitará únicamente después de conectar Supabase/PostGIS y el flujo de revisión.</p>
        </div>
      )}
    </section>
  );
}
