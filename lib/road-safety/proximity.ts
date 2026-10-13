export type RoadAlertKind = "speed-camera" | "speed-check" | "road-hazard";

export type RoadAlert = {
  id: string;
  kind: RoadAlertKind;
  latitude: number;
  longitude: number;
  createdAt: number;
  expiresAt: number;
  source: "local";
};

export type Fix = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  accuracy?: number;
};

export type NearbyRoadAlert = {
  alert: RoadAlert;
  distanceMeters: number;
  ahead: boolean;
};

export const REPORT_TTL_MS: Record<RoadAlertKind, number> = {
  "speed-camera": 30 * 24 * 60 * 60 * 1000,
  "speed-check": 2 * 60 * 60 * 1000,
  "road-hazard": 3 * 60 * 60 * 1000
};
export const ROAD_ALERTS_STORAGE_KEY = "navibori:road-alerts:v1";

function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180;
}

function rad(degrees: number) { return degrees * Math.PI / 180; }

export function metersBetween(a: Pick<Fix, "latitude" | "longitude">, b: Pick<Fix, "latitude" | "longitude">): number {
  if (!validCoordinates(a.latitude, a.longitude) || !validCoordinates(b.latitude, b.longitude)) {
    return Number.POSITIVE_INFINITY;
  }
  const r = 6371008.8;
  const latChange = rad(b.latitude - a.latitude);
  const lonChange = rad(b.longitude - a.longitude);
  const h = Math.sin(latChange / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) *
    Math.sin(lonChange / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function bearingDegrees(a: Fix, b: Fix): number {
  const dLon = rad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(rad(b.latitude));
  const x = Math.cos(rad(a.latitude)) * Math.sin(rad(b.latitude)) -
    Math.sin(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function isAhead(fix: Fix, target: Fix, distanceMeters: number): boolean {
  if (distanceMeters <= 70 || fix.heading == null || !Number.isFinite(fix.heading)) return true;
  const bearing = bearingDegrees(fix, target);
  const delta = Math.abs(((bearing - fix.heading + 540) % 360) - 180);
  return delta <= 75;
}

export function validReport(value: unknown, now = Date.now()): value is RoadAlert {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RoadAlert>;
  return typeof v.id === "string" && v.id.length > 0 && v.id.length < 100 &&
    (v.kind === "speed-camera" || v.kind === "speed-check" || v.kind === "road-hazard") &&
    typeof v.latitude === "number" && typeof v.longitude === "number" &&
    validCoordinates(v.latitude, v.longitude) &&
    typeof v.createdAt === "number" && v.createdAt <= now + 60_000 &&
    v.createdAt > now - 31 * 24 * 60 * 60 * 1000 &&
    typeof v.expiresAt === "number" && v.expiresAt > now &&
    v.expiresAt <= v.createdAt + REPORT_TTL_MS[v.kind] &&
    v.source === "local";
}

export function nearbyAlerts(
  fix: Fix,
  reports: readonly RoadAlert[],
  now = Date.now(),
  radiusMeters = 3000
): NearbyRoadAlert[] {
  if (!validCoordinates(fix.latitude, fix.longitude)) return [];
  return reports.filter((report) => validReport(report, now))
    .map((alert) => {
      const distanceMeters = metersBetween(fix, alert);
      return {alert, distanceMeters, ahead: isAhead(fix, alert, distanceMeters)};
    })
    .filter(({distanceMeters}) => distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
