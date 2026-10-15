import { describe, expect, it } from "vitest";
import { fusePeripheralSignals, scorePeripheralSignal } from "./peripheral-confidence";

describe("Peripheral Confidence", () => {
  it("rejects unavailable or unpermitted signals", () => {
    expect(scorePeripheralSignal({
      source: "vision",
      confidence: 0.95,
      freshnessMs: 20,
      permissionGranted: false,
      available: true
    })).toBe(0);
  });

  it("prefers fresher high-confidence signals", () => {
    const fused = fusePeripheralSignals([
      {
        source: "network",
        confidence: 0.9,
        freshnessMs: 7000,
        permissionGranted: true,
        available: true
      },
      {
        source: "qr",
        confidence: 0.8,
        freshnessMs: 50,
        permissionGranted: true,
        available: true
      }
    ]);
    expect(fused.primary).toBe("qr");
    expect(fused.degraded).toBe(false);
  });

  it("reports degraded state when only weak signals remain", () => {
    const fused = fusePeripheralSignals([
      {
        source: "pointer",
        confidence: 0.4,
        freshnessMs: 100,
        permissionGranted: true,
        available: true
      }
    ]);
    expect(fused.degraded).toBe(true);
  });
});
