export type SignalSource =
  | "pointer"
  | "touch"
  | "pen"
  | "gamepad"
  | "xr"
  | "uwb"
  | "qr"
  | "vision"
  | "network";

export interface PeripheralSignal {
  source: SignalSource;
  confidence: number;
  freshnessMs: number;
  permissionGranted: boolean;
  available: boolean;
}

export interface FusedPeripheralState {
  primary: SignalSource | null;
  confidence: number;
  degraded: boolean;
  contributors: SignalSource[];
}

export function scorePeripheralSignal(signal: PeripheralSignal): number {
  if (!signal.available || !signal.permissionGranted) return 0;
  const confidence = Math.max(0, Math.min(1, signal.confidence));
  const freshnessPenalty = signal.freshnessMs > 5000 ? 0.35 : signal.freshnessMs > 1500 ? 0.15 : 0;
  return Math.max(0, confidence - freshnessPenalty);
}

export function fusePeripheralSignals(
  signals: PeripheralSignal[]
): FusedPeripheralState {
  const ranked = signals
    .map((signal) => ({ signal, score: scorePeripheralSignal(signal) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      primary: null,
      confidence: 0,
      degraded: true,
      contributors: []
    };
  }

  const primary = ranked[0];
  const contributors = ranked.slice(0, 3).map((item) => item.signal.source);
  const weighted = ranked.slice(0, 3).reduce((sum, item, index) => {
    const weight = index === 0 ? 0.6 : index === 1 ? 0.25 : 0.15;
    return sum + item.score * weight;
  }, 0);

  return {
    primary: primary.signal.source,
    confidence: Number(Math.min(1, weighted).toFixed(3)),
    degraded: primary.score < 0.55,
    contributors
  };
}
