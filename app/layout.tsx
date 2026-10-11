import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import PeripheralAdapter from "@/components/system/peripheral-adapter";
import GamepadFocusController from "@/components/system/gamepad-focus-controller";
import SpecialAlertsControl from "@/components/commerce/special-alerts-control";
import DeviceLanguage from "@/components/system/device-language";

export const metadata: Metadata = {
  title: "NAVIBORI XR",
  description: "Puerto Rico Spatial Experience Platform — Juana Díaz Pilot",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NAVIBORI",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#005F8F"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-PR">
      <body>
        <DeviceLanguage />
        <PeripheralAdapter />
        <GamepadFocusController />
        {children}
        <SpecialAlertsControl />
      </body>
    </html>
  );
}
