export interface SessionHandoffPayload {
  version: 1;
  venueId: string;
  mode: "map" | "ar" | "vr" | "twin";
  destinationPoiId?: string;
  routeProfile?: "standard" | "accessible";
  questId?: string;
  selectedLayer?: string;
  createdAt: string;
}

export function createSessionHandoff(
  input: Omit<SessionHandoffPayload, "version" | "createdAt">
): SessionHandoffPayload {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    ...input
  };
}

export function encodeSessionHandoff(payload: SessionHandoffPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeSessionHandoff(value: string): SessionHandoffPayload | null {
  try {
    const decoded = decodeURIComponent(escape(atob(value)));
    const parsed = JSON.parse(decoded) as SessionHandoffPayload;
    if (parsed.version !== 1 || !parsed.venueId || !parsed.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}
