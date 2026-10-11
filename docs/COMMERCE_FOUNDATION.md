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

## Runtime GPS diagnostics
- The full-map experience exposes a persistent GPS control so customers can test/recenter location without opening the menu.
- The GPS menu can run a runtime diagnostic that checks HTTPS secure context, browser geolocation support, geolocation permission state when the Permissions API is available, and server-side routing health.
- The application now sends an explicit Permissions-Policy header allowing geolocation for self.
- /api/routing/health validates routing availability from the NAVIBORI server using fixed Puerto Rico test coordinates; it never uses or stores customer GPS data.
- Diagnostic output separates device/browser permission problems from routing-provider problems.

## Live route progress
- Active navigation projects the current GPS fix onto the route geometry to estimate traveled distance and remaining distance.
- ETA is recalculated from the remaining route fraction and displayed as an arrival clock time.
- The next maneuver advances as the user passes maneuver points instead of remaining fixed on the first instruction.
- Voice guidance may repeat the same instruction at far, near and now distance bands.
- Route progress remains session-only and is not persisted.

## Peripheral-aware language and adaptive controls
- NAVIBORI language priority is: peripheral/host locale, then browser/device languages, then Puerto Rico Spanish fallback.
- A native shell, kiosk, embedded peripheral host, or future vehicle integration can set `window.__NAVIBORI_PERIPHERAL_LOCALE__` before hydration or dispatch `navibori:peripheral-locale` with `detail.locale` at runtime.
- Runtime peripheral language changes propagate through `navibori:localechange`; the full map, navigation HUD, voice locale, routing locale, document language, and special-alert controls update without a reload.
- The menu exposes the active locale and whether it came from the device or a peripheral so operators can verify the source.
- Browser APIs do not expose the UI language of arbitrary keyboards, headsets, or gamepads. When a peripheral does not provide locale metadata through the host bridge, NAVIBORI correctly falls back to the device/browser locale.
- PeripheralAdapter now drives adaptive control density: touch/gamepad/XR use comfortable targets, pointer layouts can be compact, keyboard/gamepad focus is emphasized, and reduced-motion preferences suppress nonessential CSS motion.
- Touch targets are kept at comfortable sizes while the map remains the dominant interactive surface.

## High-visibility navigation route
- The route overlay now uses four visual layers: route glow, dark casing, high-contrast primary line, and repeated directional arrows.
- Route layers are explicitly moved to the top of the MapLibre layer stack so the raster basemap cannot cover them.
- If the route arrives before the map style is fully ready, NAVIBORI retries rendering at 100 ms, 300 ms, 700 ms, and 1400 ms and once again when the map becomes idle.
- Route redraw retries are cancelled when the route changes, preventing a stale recalculated route from being painted over the current route.
- Mobile navigation hides redundant zoom/globe controls, keeps familiar map gestures, and reduces the permanent HUD height so more of the route stays visible.
- The mobile HUD prioritizes next maneuver, ETA, remaining distance, speed, follow/recenter, voice, and end-navigation controls; GPS diagnostics remain available from the menu.

## Route arrows and device language
- Active navigation draws a high-contrast route from the current origin to the selected commerce destination and overlays repeated directional arrow symbols along the route.
- Route arrows use the same route geometry returned by OSRM/Valhalla, so they indicate the path the customer should follow rather than a straight-line bearing.
- NAVIBORI reads navigator.languages / navigator.language on the device and updates the document language at runtime.
- Navigation locale is forwarded to the routing API and Valhalla. English devices receive English turn instructions; Spanish devices receive Spanish turn instructions.
- Speech synthesis prefers a voice matching the device locale and falls back to the corresponding supported language.
- Arrival time formatting follows the device locale.
- Special/promotion notification controls switch between Spanish and English using the device language.
- For device languages not yet translated by NAVIBORI, locale-aware formatting is preserved while interface/instruction copy falls back to Spanish.

## Waze-style navigation preflight
- Every transport entry point uses the same commerce navigation eligibility rule, including map pins, Nearby and the destination card.
- Each navigation attempt automatically runs a lightweight GPS/routing preflight in parallel with location acquisition.
- The preflight checks secure context, browser geolocation support, permission state and routing provider health.
- If GPS startup fails, the navigation phase remains visibly in error state and exposes a one-tap “Reintentar GPS” action instead of silently returning to idle.
- DEMO destinations expose the same internal GPS test flow without being presented as real merchants; LIVE routing still requires verified public coordinates.

## GPS dual acquisition and routing fallback
- GPS startup now runs getCurrentPosition and watchPosition in parallel and uses the first valid fix received.
- If high-accuracy positioning fails without a permission denial, NAVIBORI retries with lower-accuracy cached positioning before giving up.
- A standalone “Probar GPS” action verifies whether the browser/device can supply location before any commerce route is requested.
- GPS startup includes a bounded 25-second diagnostic timeout with actionable permission/location guidance.
- The routing API first tries the existing OSRM/OpenStreetMap service and automatically falls back to the FOSSGIS Valhalla/OpenStreetMap service when OSRM fails, times out or returns an unusable route.
- Valhalla fallback costing maps driving→auto, walking→pedestrian, cycling→bicycle and scooter→motor_scooter.
- Routing responses identify which provider produced the route; customer GPS coordinates remain session-only.

## GPS bootstrap and DEMO route diagnostics
- GPS navigation now obtains an explicit initial position with getCurrentPosition before starting continuous watchPosition tracking.
- The first successful GPS fix immediately triggers route calculation instead of waiting for a later watch refresh.
- Permission, unavailable-position and timeout errors now provide actionable customer messages.
- When production has no LIVE verified businesses, DEMO points may run an internal route test so the GPS pipeline can be validated end-to-end.
- DEMO navigation is visibly labeled “GPS DEMO” and “Ruta de prueba DEMO”; external Google Maps launching is disabled for synthetic destinations.
- A DEMO route must never be represented as a real merchant route. Customer-ready LIVE navigation still requires an active verified business with a verified exterior address and coordinates.

## Opt-in special push notifications
- NAVIBORI registers a service worker and exposes a global “Recibir especiales” control on supported browsers.
- Notification permission is requested only after an explicit user action; NAVIBORI never prompts automatically on page load.
- Push subscriptions are stored server-side with RLS and direct client access denied. Customer GPS coordinates are not stored with a push subscription.
- An active verified merchant can manually send its currently active LIVE promotion once. Duplicate sends for the same promotion are prevented by a dispatch ledger.
- Promotions with a scheduled start time are checked every 10 minutes by Supabase Cron and sent once when they become due.
- Push delivery wakes the installed PWA, which fetches the current LIVE special and displays the business, promotion title, description and a link to the business profile.
- Users can disable specials from the same NAVIBORI control; expired push endpoints are automatically disabled after delivery failures.

## Route step directions
- Active routes expose an expandable “Indicaciones de la ruta” panel using the same OSRM maneuver steps already returned for turn-by-turn guidance.
- The panel shows up to twelve upcoming route steps with Spanish instruction text, segment distance and street/road name when available.
- Opening or closing the directions panel does not request another route and does not affect GPS tracking, rerouting or arrival detection.
- The same feature works across driving, walking, cycling and scooter modes.

## Route overview and destination clarity
- The selected commerce destination is visually emphasized on the map and labeled “Destino”.
- The destination marker represents the verified public entrance used by customer routing.
- “Ver ruta completa” fits the current route, customer location and destination into one map view.
- When GPS navigation is active, route overview pauses only automatic camera follow; tracking, turn guidance and rerouting remain active.
- The customer can return to position-follow mode using “Recentrar en mi GPS”.

## GPS camera follow and recenter
- During active GPS navigation, NAVIBORI follows the customer position by default.
- Direct pointer interaction with the map pauses only the automatic camera follow; GPS tracking, route updates and off-route recalculation continue running.
- A persistent “Recentrar en mi GPS” control returns the camera to the current customer position without restarting navigation.
- The customer may also explicitly toggle between followed and free-map views from the map toolbar.

## Bicycle and scooter GPS navigation
- Customer routing supports four NAVIBORI modes: driving, walking, cycling and scooter.
- Driving uses the FOSSGIS/OSRM car graph; walking uses the foot graph; cycling uses the bike graph.
- Scooter is a NAVIBORI micromobility mode backed by the OSRM bike graph because the public routing service does not expose a scooter-specific graph.
- All four modes retain the same browser GPS tracking, route drawing, turn-by-turn instructions, off-route recalculation and arrival detection.
- External Google Maps fallback maps cycling and scooter to bicycling mode; NAVIBORI remains the primary in-app navigation surface.
- Micromobility routing is route guidance, not a statement that scooter or bicycle operation is permitted on every segment; customers must follow local signs, access rules and conditions.

## Profile-to-GPS navigation
- Public business profiles and the commerce directory expose separate driving and walking actions for verified LIVE locations.
- Those actions open the NAVIBORI map with `business=<slug>` and `route=driving|walking`.
- The map resolves the selected business and starts the existing browser GPS navigation flow for the requested mode.
- Geolocation still requires the customer's browser permission; the deep link never bypasses device privacy controls.

## Verified exterior location picker
- Commerce Review includes a MapLibre/OpenStreetMap picker for the public exterior destination used by customer navigation.
- An administrator can click the map, drag the marker or explicitly use the browser/device current location when physically at the storefront.
- The picker writes latitude and longitude into the existing verified review fields; the administrator still verifies the human-readable public address separately.
- The exterior navigation pin should represent the customer-accessible entrance, not an arbitrary building centroid.
- The optional interior `space_id` remains separate for future indoor routing.

## Map business search
- Customers can search mapped commerce by business name, category or public address.
- Search normalizes case and diacritics so terms such as “Diaz” and “Díaz” match consistently.
- Search results can focus a business on the map or start driving/walking GPS navigation directly for verified LIVE destinations.
- In LIVE mode, the map now applies defense-in-depth filtering: coordinates alone are insufficient; the business location and map destination must both be verified before the business can appear as a navigable map destination.

## Nearby commerce discovery
- The map does not request customer location automatically; the customer explicitly uses “Mi ubicación”.
- Once a location is available, mapped businesses are ranked by straight-line proximity for discovery only.
- NAVIBORI shows up to five nearby businesses with approximate distance and public address.
- Verified LIVE businesses expose one-tap driving and walking actions that select the business and start the existing GPS navigation flow.
- DEMO businesses may appear for interface testing but cannot start real navigation.

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
