# NAVIBORI Commerce Foundation

## Primary visitor experience
- discover businesses
- search by name, tag or featured offer
- filter by category
- view active promotions
- save favorites locally
- inspect featured products/services
- view contact actions when real data exists
- request route only when location/routing are verified
- submit general, pickup or reservation requests when the merchant enables them
- choose only published fulfillment slots with remaining capacity
- respect merchant blackout periods before a request is created

## Merchant Console
The Merchant Console supports a local draft for resilience plus merchant-scoped Supabase synchronization under RLS for authorized accounts.

Operational capabilities:
- business profile and verification workflow
- visual identity/media
- public QR/deep-link kit
- weekly hours
- catalog/products/services
- promotions
- request/pickup/reservation configuration
- per-slot pickup and reservation capacity
- merchant-defined fulfillment blackout periods
- realtime customer request inbox
- request acceptance/completion/cancellation
- quick customer contact
- CSV request export
- historical business analytics
- 7-day capacity dashboard with saturation alerts
- daily fulfillment operations board with date navigation, slot utilization, scheduled-request actions and no-show handling
- operational fulfillment progression: accepted → preparing → ready → completed
- merchant ETA controls for accepted/preparing requests
- secure customer self-service status tracking with 15-second refresh

Public activation remains review-controlled by the venue workflow. Merchant content does not bypass verification/publication rules.

## Fulfillment truth rule
Customer-facing slot availability and the merchant daily operations board use the same Supabase fulfillment RPC/capacity model. NAVIBORI does not maintain a second client-only inventory of capacity.

A submitted request still requires merchant confirmation. Requests in new, accepted, preparing and ready states continue consuming slot capacity until they are completed, cancelled or marked no-show. Customer status links expose only operational status/timing data after token verification; they do not expose stored contact details or private notes. NAVIBORI does not currently process payment.

## Turn-by-turn GPS guidance
- OSRM routing requests include `steps=true` so NAVIBORI receives maneuver-level route instructions.
- NAVIBORI normalizes common maneuvers into Spanish guidance for turn, continue, merge, ramps, forks, roundabouts and arrival.
- The navigation card shows the next maneuver and approximate distance to it.
- When GPS position moves outside the active route corridor, NAVIBORI recalculates the route after a short guard interval.
- Arrival is detected from GPS-to-destination distance with an accuracy-aware threshold; GPS tracking then stops automatically.
- When heading data is available, follow mode rotates the map toward the direction of travel.
- Optional browser speech synthesis can read upcoming maneuvers in Spanish; the user explicitly enables or disables voice guidance.

## Live GPS navigation
- Starting driving or walking navigation uses browser `watchPosition` with high-accuracy mode.
- The customer marker moves continuously while GPS navigation is active.
- Remaining route distance and ETA are recalculated after meaningful movement with time/distance thresholds to avoid excessive routing traffic.
- GPS following can be paused while keeping navigation active, and tracking can be stopped without immediately removing the visible route.
- Accuracy is shown in meters when the browser/device provides it.
- Customer GPS coordinates remain session-only in the browser and are never written to Supabase.

## In-map routing
- A customer can calculate a driving or walking route directly inside NAVIBORI after granting browser geolocation permission.
- NAVIBORI requests GeoJSON route geometry, distance and duration through its own server endpoint and draws the route in MapLibre.
- The routing proxy accepts only Puerto Rico coordinates, does not persist customer coordinates and sends requests with a NAVIBORI user agent.
- Public FOSSGIS/OpenStreetMap routing is throttled to at most one request start per second per application process.
- Google Maps remains an optional external fallback, not the primary routing experience.
- For higher production volume, NAVIBORI should migrate to a dedicated/self-hosted routing service or contracted provider.

## Map and directions truth rule
- Published LIVE businesses appear on the customer map only when coordinates are present.
- Driving/walking actions require a verified exterior destination (address + latitude + longitude).
- Exterior routing verification is independent from the optional interior space assignment.
- DEMO pins remain synthetic and never enable real directions.
- NAVIBORI opens Google Maps directions with driving or walking travel mode; device location may be used by Google Maps when available.

## Data truth rule
Demo businesses are always labeled synthetic.
No demo location, opening status, product, price or promotion may be represented as an actual Mercado Metropolitano business.
