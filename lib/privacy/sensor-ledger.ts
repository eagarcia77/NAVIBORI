export type SensorCapability =
  | "camera"
  | "microphone"
  | "geolocation"
  | "orientation"
  | "motion"
  | "nfc"
  | "bluetooth"
  | "xr"
  | "notifications";

export type SensorDecision = "granted" | "denied" | "not_requested";

export interface SensorLedgerEntry {
  capability: SensorCapability;
  decision: SensorDecision;
  updatedAt: string;
}

const STORAGE_KEY = "navibori.sensor-ledger.v1";

export function readSensorLedger(): SensorLedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordSensorDecision(
  capability: SensorCapability,
  decision: SensorDecision
): SensorLedgerEntry[] {
  if (typeof window === "undefined") return [];

  const current = readSensorLedger().filter((item) => item.capability !== capability);
  const next = [
    ...current,
    { capability, decision, updatedAt: new Date().toISOString() }
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSensorLedger() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
