# NAVIBORI 3D — production-safe Render release

## Target
Render workspace: My Workspace
Service: navibori, https://navibori.onrender.com
Branch: foundation/navibori-v0.1

## Rendering
- Starts with MapLibre + OpenFreeMap Liberty vector style.
- Builds 3D extrusions using building metadata, defaulting to an estimated volume if some heights are missing.
- Retains route overlays and GPS navigation.
- Switches automatically to the known-good OSM raster basemap when the vector style fails or no vector features load within 12 seconds.
- No provider is guaranteed to have reliable buildings everywhere in Puerto Rico. Lack of verified building heights is labeled as an estimate, not factual altitude data.
- Users can alternate 2D, 3D and globe; perspective preference versioned separately from the previous UI.
- Visual status indicator animation honors reduced-motion settings.

## Acceptance tests
1. Open fresh browser tab in HTTPS, confirm streets appear within 12s.
2. Confirm 3D buildings extend above ground at zoom >=15 in a neighborhood with mapped building footprints.
3. Toggle 2D / 3D; verify the pitch, camera and building visibility.
4. Block OpenFreeMap style or vector tile requests; confirm OSM raster fallback rather than a blank map.
5. Start routes for car, pedestrian, cycling and scooter; ensure turn arrow, route and destination remain visible.
6. Test actual GPS outdoors on iOS Safari and Android Chrome. GPS DEMO is not verification of real GPS.
7. Confirm animation is disabled by reduced-motion OS setting.

## Rollback
Render uses automatic commits from foundation/navibori-v0.1. If the site is blank, revert the release commit(s) or redeploy the previously working commit d030826582a5a9bdc584e3c411687f16679a6c82.

## Operational caveats
Third-party tile coverage/availability varies. OpenFreeMap currently does not provide an SLA. Do not interpret visualization-only building elevation as verified street clearance or safety information.
