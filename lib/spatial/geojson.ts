export interface GeoJsonValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  featureCount: number;
}

type GeoJsonFeature = {
  type?: unknown;
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  } | null;
  properties?: Record<string, unknown> | null;
};

type GeoJsonFeatureCollection = {
  type?: unknown;
  features?: unknown;
};

const allowedGeometryTypes = new Set([
  "Point",
  "LineString",
  "Polygon",
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon"
]);

export function validateGeoJson(input: unknown): GeoJsonValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["El archivo no contiene un objeto JSON válido."], warnings, featureCount: 0 };
  }

  const collection = input as GeoJsonFeatureCollection;
  if (collection.type !== "FeatureCollection") {
    errors.push("NAVIBORI Studio requiere un GeoJSON FeatureCollection.");
  }

  if (!Array.isArray(collection.features)) {
    errors.push("La propiedad features debe ser un arreglo.");
    return { valid: false, errors, warnings, featureCount: 0 };
  }

  const features = collection.features as GeoJsonFeature[];

  features.forEach((feature, index) => {
    if (!feature || feature.type !== "Feature") {
      errors.push("Feature " + (index + 1) + ": type debe ser Feature.");
      return;
    }

    if (!feature.geometry) {
      warnings.push("Feature " + (index + 1) + ": no contiene geometry.");
      return;
    }

    if (typeof feature.geometry.type !== "string" || !allowedGeometryTypes.has(feature.geometry.type)) {
      errors.push("Feature " + (index + 1) + ": tipo de geometría no soportado.");
    }

    if (feature.geometry.coordinates === undefined) {
      errors.push("Feature " + (index + 1) + ": faltan coordinates.");
    }

    if (!feature.properties || typeof feature.properties !== "object") {
      warnings.push("Feature " + (index + 1) + ": sin properties; se recomienda incluir provenance.");
    } else if (!("provenance" in feature.properties)) {
      warnings.push("Feature " + (index + 1) + ": falta properties.provenance.");
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    featureCount: features.length
  };
}
