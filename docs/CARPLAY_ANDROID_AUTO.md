# NAVIBORI in-car integration roadmap (Apple CarPlay / Android Auto)

This repository currently deploys a Next.js web app. **Web deployment does not install a CarPlay or Android Auto app.** No in-car support is claimed yet.

## Shared navigation contract
`lib/commerce/car-navigation-contract.ts` defines the destination, maneuver, remaining distance, ETA, route geometry and an explicit demo flag. This is a validation-only TypeScript contract, not a native bridge or navigation renderer.

## iOS / Apple CarPlay
- Create an iOS app target in Xcode with a real navigation engine and vehicle-safe UI.
- Request the Apple CarPlay navigation entitlement `com.apple.developer.carplay-maps` and obtain approval.
- Implement the supported CarPlay navigation templates/scenes (such as `CPMapTemplate`) and render the route.
- Test with Xcode CarPlay Simulator and real compatible vehicles. Pass App Store review.

Official reference: https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements

## Android / Android Auto
- Create a native Android app with `androidx.car.app` (Android for Cars App Library).
- Declare `androidx.car.app.category.NAVIGATION` in the `CarAppService` manifest.
- Implement NavigationTemplate/MapWithContentTemplate and render a map using the supported surface APIs.
- Validate driver distraction requirements, Android Auto emulator/desktop head unit and real vehicle. Submit for Play review.

Official reference: https://developer.android.com/training/cars/apps/navigation

## Driving safety and merchant offers
- Do not place merchant promotion popups, video, or complex marketing controls over in-car navigation.
- Route guidance and voice prompts must remain legible and interruptible.
- Do not misrepresent demo routes as live guidance.
- Require opt-in for location-based marketing; promotional delivery on car displays must comply with platform policies.
- Do not transmit raw user GPS coordinates to merchants.
- A native app may reuse backend merchant and routing APIs, but must not rely on a WebView of the Next.js site as a CarPlay/Android Auto navigation app.

## Required before calling this complete
1. Production-grade routing API, location lifecycle, rerouting and voice guidance.
2. iOS and Android native projects and permissions.
3. Native in-car map renderer and trip state synchronization.
4. Simulator, road and accessibility testing.
5. Apple entitlement, app review and Google Play car app approval.
