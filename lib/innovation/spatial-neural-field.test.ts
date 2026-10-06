import { describe, expect, it } from "vitest";
import { resolveSpatialNeuralField } from "./spatial-neural-field";

describe("Spatial Neural Field", () => {
  it("prefers WebNN when available", () => {
    const result = resolveSpatialNeuralField({
      webNnAvailable: true,
      webGpuAvailable: true,
      workerAvailable: true,
      sensorInputRequested: false,
      sensorConsentGranted: false,
      task: "experience-selection"
    });
    expect(result.target).toBe("webnn");
    expect(result.mayChangeAuthoritativeSpatialData).toBe(false);
  });

  it("blocks sensor inference without consent", () => {
    const result = resolveSpatialNeuralField({
      webNnAvailable: true,
      webGpuAvailable: true,
      workerAvailable: true,
      sensorInputRequested: true,
      sensorConsentGranted: false,
      task: "scene-classification"
    });
    expect(result.enabled).toBe(false);
  });
});
