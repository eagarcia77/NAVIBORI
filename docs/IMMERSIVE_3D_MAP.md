# NAVIBORI — Immersive 3D map v2

## Why the previous map looked flat

The previous app used a raster OSM basemap and an optional, low-opacity fill-extrusion overlay. The camera's pitch created perspective, but most buildings could still appear flat. 3D geometry is distinct from an angled 2D image.

## What this update changes

- The initial view uses OpenFreeMap's vector **Bright** style with MapLibre GL JS.
- Building polygons in the OpenMapTiles `building` source layer are extruded using their published height attributes (`render_height`, `render_min_height`, or `height`).
- Where a footprint exists but heights are absent, a default estimated number of floors is used only to visualize volume. **Those approximate heights must not be used as measured building heights or as routing/safety inputs.**
- Perspective defaults to 3D; users can choose 2D or globe view. New preferences are stored under `navibori:map-mode-v2` to avoid inadvertently restoring old 2D defaults.
- Routes and navigation markers remain above the building geometry. Buildings become less opaque while navigating.
- When tiles are unavailable, the app falls back to the original OSM raster basemap for essential routing, reporting that 3D buildings are unavailable.
- The status UI reports areas where 3D building coverage cannot be found in the current viewport; 3D is not guaranteed in all Puerto Rico neighborhoods.
- Animation respects the system's reduced-motion setting.

## Test checklist

1. On a fresh browser profile, load the map with working network access. Confirm vector roads, pitched 3D camera, clearly extruded buildings where footprints exist, and an active 3D control.
2. Zoom to a region with verified building data and confirm walls and roofs appear above the street rather than a flat 2D polygon.
3. Change 3D -> 2D -> 3D; verify the camera tilts, buildings hide/show, the map stays navigable, and the choice persists across reloads.
4. Enable reduced-motion; confirm indicator animation is suppressed.
5. Start navigation in each mode (car, walk, bicycle, scooter). Confirm route lines and turn arrows are visible above building faces.
6. Start real GPS navigation in an HTTPS secure context, grant location permission, and compare location accuracy and route recalculation while moving. Do not interpret GPS DEMO as live GPS.
7. Simulate an unavailable vector provider. Confirm the map recovers with a raster basemap and clearly indicates that buildings are unavailable. Essential navigation must not be blocked.
8. Verify iOS Safari, Android Chrome, narrow-screen layouts, and landscape orientation.

## Operations

OpenFreeMap hosts publicly available vector map tiles and publishes attribution and licensing at https://openfreemap.org/. MapLibre renders OpenStreetMap/OpenMapTiles data. OpenFreeMap public instance does not currently offer a service-level agreement, so production deployments should monitor service health and plan a commercial or self-hosted contingency as usage scales.

This branch is a code change only. Its visual results, real GPS accuracy, GitHub Actions validation, and Render deployment require separate checks.