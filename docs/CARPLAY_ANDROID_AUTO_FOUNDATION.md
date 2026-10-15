# NAVIBORI Native Vehicle Integration Foundation

NAVIBORI web/PWA remains the public commerce map and routing surface. Native vehicle integrations reuse the same verified commerce destinations and routing API.

## Shared navigation contract
Native clients should send:
- mode: driving | walking | cycling | scooter
- origin: latitude/longitude
- destination: latitude/longitude

They consume the existing `POST /api/routing` response:
- route geometry
- distanceMeters
- durationSeconds
- turn-by-turn steps
- routing provider

## Apple CarPlay
A full NAVIBORI CarPlay navigation app requires:
- a native iOS target
- Apple approval for the CarPlay navigation entitlement
- a CarPlay scene
- CPMapTemplate / CPTrip / CPNavigationSession
- CPManeuver updates and CPTravelEstimates during active guidance
- native Core Location tracking
- App Store review under CarPlay navigation requirements

The web app cannot itself become a full CarPlay navigation app. The current Apple Maps handoff is the immediate production bridge.

## Android Auto / Android Automotive OS
A full NAVIBORI vehicle app requires:
- a native Android target
- Android for Cars App Library
- CarAppService
- category androidx.car.app.category.NAVIGATION
- navigation templates / MapWithContentTemplate
- Android location service and route progress updates
- car app quality validation and Play review

The current Google Maps handoff is the immediate production bridge.

## Architecture
1. User selects a verified commerce destination.
2. NAVIBORI route service returns the route.
3. Web, iOS CarPlay and Android Auto consume the same route contract.
4. Device-native location feeds route progress.
5. Reroute calls reuse `POST /api/routing`.
6. Push promotions remain separate from active navigation and must respect driver-distraction rules.

## Safety / privacy
- Never publish DEMO coordinates as real businesses.
- Customer location remains session-only unless explicit future consent is designed.
- Promotions must not interrupt active vehicle guidance with unsafe UI.
