import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVIBORI XR",
  description: "Puerto Rico Spatial Experience Platform — Juana Díaz Pilot",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#005F8F"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-PR">
      <body>{children}</body>
    </html>
  );
}
