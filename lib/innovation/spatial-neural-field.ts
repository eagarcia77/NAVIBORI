export type NeuralExecutionTarget = "webnn" | "webgpu" | "worker-cpu" | "disabled";

export interface SpatialNeuralFieldContext {
  webNnAvailable: boolean;
  webGpuAvailable: boolean;
  workerAvailable: boolean;
  sensorInputRequested: boolean;
  sensorConsentGranted: boolean;
  task: "scene-classification" | "experience-selection" | "visual-assist";
}

export interface SpatialNeuralFieldDecision {
  enabled: boolean;
  target: NeuralExecutionTarget;
  retainRawSensorData: false;
  mayChangeAuthoritativeSpatialData: false;
  reason: string;
}

export function resolveSpatialNeuralField(
  context: SpatialNeuralFieldContext
): SpatialNeuralFieldDecision {
  if (context.sensorInputRequested && !context.sensorConsentGranted) {
    return {
      enabled: false,
      target: "disabled",
      retainRawSensorData: false,
      mayChangeAuthoritativeSpatialData: false,
      reason: "Explicit sensor consent is required."
    };
  }

  if (context.webNnAvailable) {
    return {
      enabled: true,
      target: "webnn",
      retainRawSensorData: false,
      mayChangeAuthoritativeSpatialData: false,
      reason: "Use local hardware-accelerated neural inference."
    };
  }

  if (context.webGpuAvailable) {
    return {
      enabled: true,
      target: "webgpu",
      retainRawSensorData: false,
      mayChangeAuthoritativeSpatialData: false,
      reason: "Use WebGPU inference fallback."
    };
  }

  if (context.workerAvailable) {
    return {
      enabled: true,
      target: "worker-cpu",
      retainRawSensorData: false,
      mayChangeAuthoritativeSpatialData: false,
      reason: "Use CPU worker fallback."
    };
  }

  return {
    enabled: false,
    target: "disabled",
    retainRawSensorData: false,
    mayChangeAuthoritativeSpatialData: false,
    reason: "No supported local inference target is available."
  };
}
