export interface PlanarPoint {
  x: number;
  z: number;
}

export interface ExtrusionDescriptor {
  id: string;
  label: string;
  footprint: PlanarPoint[];
  heightMeters: number;
  elevationMeters: number;
}

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type PolygonFeature = {
  type: "Feature";
  geometry: PolygonGeometry;
  properties?: Record<string, unknown> | null;
};

export function polygonFeatureToExtrusion(
  feature: PolygonFeature,
  fallbackId: string
): ExtrusionDescriptor | null {
  const ring = feature.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;

  const valid = ring.every((position) =>
    Array.isArray(position)
    && position.length >= 2
    && Number.isFinite(position[0])
    && Number.isFinite(position[1])
  );

  if (!valid) return null;

  const props = feature.properties ?? {};
  const height = Number(props.heightMeters ?? 3);
  const elevation = Number(props.elevationMeters ?? 0);

  return {
    id: String(props.id ?? fallbackId),
    label: String(props.name ?? props.label ?? "Espacio"),
    footprint: ring.map(([x, z]) => ({ x, z })),
    heightMeters: Number.isFinite(height) && height > 0 ? height : 3,
    elevationMeters: Number.isFinite(elevation) ? elevation : 0
  };
}
