import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVIBORI XR",
  description: "Puerto Rico Spatial Experience Platform — Juana Díaz Pilot"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#005F8F"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
