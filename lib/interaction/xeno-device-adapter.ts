export type XenoDeviceTransport =
  | "webhid"
  | "webusb"
  | "bluetooth"
  | "gamepad"
  | "native-bridge"
  | "network"
  | "unknown";

export interface XenoDeviceDescriptor {
  id: string;
  label: string;
  transport: XenoDeviceTransport;
  capabilities: string[];
  requiresExplicitPermission: boolean;
}

export interface XenoNormalizedEvent {
  deviceId: string;
  type: "button" | "axis" | "pose" | "range" | "haptic" | "sensor" | "custom";
  timestamp: number;
  values: Record<string, number | string | boolean>;
}

export interface XenoDeviceAdapter {
  descriptor: XenoDeviceDescriptor;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  read(): AsyncIterable<XenoNormalizedEvent>;
}

export function mayAutoConnectDevice(device: XenoDeviceDescriptor) {
  return !device.requiresExplicitPermission &&
    (device.transport === "gamepad" || device.transport === "network");
}
