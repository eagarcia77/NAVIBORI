# NAVIBORI para iPhone + Apple CarPlay — Native foundation

**Status (2026-10-15): Development foundation, not a released or installed CarPlay app.**

This target uses UIKit, MapKit, CarPlay, SwiftUI and the shared NAVIBORI backend.
The full-screen map is rendered in the CarPlay CPWindow; CPMapTemplate
provides Apple's navigation UI. This is not a Safari/PWA
mirror, an Apple Maps handoff, or a method of sideloading CarPlay.

## Implemented foundation

- Separate native iPhone scene and native CarPlay navigation scene.
- Verified-only, read-only merchant feed:
  GET https://navibori.onrender.com/api/carplay/destinations
- Search real Puerto Rico places on the iPhone via MapKit; selected destinations
  become available in CarPlay. No synthetic/demo coordinates are used.
- Driving route requests to the existing NAVIBORI engine:
  POST https://navibori.onrender.com/api/routing
- Native MKMapView with NAVIBORI route polyline, GPS, CPTrip preview,
  CPNavigationSession, upcoming maneuvers and remaining trip estimates.
- Aborts outdated destination requests; cancellation/arrival lifecycle;
  off-route safeguard (stops stale guidance and requires re-preview).
- Separate app screens on the iPhone and the car display.
- GitHub CI compiles the iOS target on a macOS runner when available.
- Only publicly verified businesses; no authentication tokens or keys embedded.

## Required before CarPlay appears on a vehicle

1. Have access to a Mac with Xcode and a registered Apple Developer account.
2. Submit the Navigation category CarPlay entitlement request to Apple.
   The entitlement com.apple.developer.carplay-maps is a managed capability
   that Apple MUST approve. Merely committing CarPlay.entitlements does
   not authorize provisioning or make the icon appear in the dashboard.
3. After approval, register and provision com.zenqavio.navibori (or an agreed
   unique production bundle ID) with a team that has that entitlement.
4. Generate the project using XcodeGen:
   cd ios/NAVIBORI && xcodegen generate
5. Open NAVIBORI.xcodeproj in Xcode. Select the developer team, refresh signing,
   build, install on the iPhone, then connect a CarPlay-compatible vehicle.
6. For simulator tests, use Xcode Simulator > I/O > External Displays > CarPlay.
   Use code signing disabled for CI only. A successful simulator build does
   not prove a physical vehicle is authorized/working.

Apple official references:
- https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements
- https://developer.apple.com/documentation/carplay/displaying-content-in-carplay
- https://developer.apple.com/documentation/carplay/integrating-carplay-with-your-navigation-app
- https://developer.apple.com/documentation/carplay/cpmaptemplate

## Operational limitations and next validation gates

- Current target provides a phase-one MapKit basemap with NAVIBORI route
  geometry, not yet the custom NovaScene 3D MapLibre visualization.
- Turn maneuvers are based on live position and the route-service step list.
  Validate alignment, recalculation, poor connectivity, tunnel GPS loss,
  step timing and voice UX before production use. Never rely on these
  unvalidated directions as the sole navigation source in traffic.
- Native client displays no ads or distracting controls while driving.
  Merchant lists use CPListTemplate; searches take place on the iPhone.
- CarPlay merchant feed is empty until real, verified NAVIBORI businesses
  exist; MapKit search can select real destinations meanwhile.
- Signed iOS build, actual CarPlay simulator testing, Apple entitlement,
  on-road testing, TestFlight, privacy and interoperability remain necessary.
- No Developer enrollment, entitlement approval, provisioning profiles,
  commercial domain or App Store submission has been performed.
- Backend deployment to Render is separate and does not install an app.
