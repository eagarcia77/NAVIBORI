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


## Instalación guiada sin membresía pagada: NAVIBORI Preview para iPhone

### Antes de empezar

1. Verifica membresía en https://developer.apple.com/account/.
   Un equipo "Personal Team" en Xcode es gratuito y **no autoriza CarPlay**.
2. Instala Xcode desde Mac App Store y abre Xcode al menos una vez.
3. En Terminal verifica: `xcodebuild -version`.
4. Instala XcodeGen con Homebrew si no está disponible: `brew install xcodegen`.
5. Descarga el código:

    git clone -b foundation/navibori-v0.1 https://github.com/eagarcia77/NAVIBORI.git
    cd NAVIBORI/ios/NAVIBORI

### Crear únicamente la app para iPhone

**No** uses el proyecto CarPlay principal si todavía no tienes aprobado
com.apple.developer.carplay-maps; Xcode no podrá firmarlo con Personal Team.

    xcodegen generate --spec project-phone.yml
    open NAVIBORIPhone.xcodeproj

En Xcode elige target NAVIBORI > Signing & Capabilities,
activa "Automatically manage signing", selecciona tu "Personal Team",
y modifica el Bundle Identifier si Xcode indica que ya está registrado.
Conecta el iPhone, confía en la Mac y selecciona el dispositivo
en la barra superior. Activa "Developer Mode" si iOS lo solicita
(Settings > Privacy & Security > Developer Mode). Presiona Run (▶).

La pantalla instalada se llamará **NAVIBORI Preview**.
Puede buscar lugares reales y probar la ubicación del iPhone.
No aparecerá como aplicación en CarPlay ni permitirá la navegación
CarPlay; la cuenta gratuita generalmente requiere renovar la
instalación/prueba cada siete días.

### Cuando Apple autorice la categoría CarPlay Navigation

    xcodegen generate --spec project.yml
    open NAVIBORI.xcodeproj

En el Apple Developer portal habilita la capacidad aprobada para
com.zenqavio.navibori (o el Bundle ID final) y crea un provisioning
profile que contenga el permiso. Ajusta Code Signing y selecciona
el equipo aprobado antes de construir e instalar en un iPhone.

Documentación oficial:
- https://developer.apple.com/help/account/basics/about-your-developer-account
- https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements
- https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device

**Nota de seguridad:** el código compilado por CI no constituye
una autorización de CarPlay ni significa que el GPS esté validado
en tráfico real. No pruebes la interfaz mientras conduces.
