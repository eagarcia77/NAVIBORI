# NAVIBORI Routing API Contract (draft)

The browser-side `DirectionsClient` expects a **same-origin** HTTPS endpoint:

`POST /api/directions`

Request:
```json
{"origin":{"lat":18.0,"lng":-66.5},"destination":{"lat":18.01,"lng":-66.51},"mode":"driving"}
```

Response:
```json
{
 "coordinates":[{"lat":18.0,"lng":-66.5},{"lat":18.01,"lng":-66.51}],
 "distanceMeters":2200,
 "durationSeconds":420,
 "steps":[]
}
```

**Example numbers are illustrative, not actual directions.**

## Server requirements
- Validate coordinate ranges and travel mode; enforce request size and rate limits.
- Connect a real licensed routing engine (Valhalla, GraphHopper, OSRM or other provider), with explicit profiles for driving, walking, cycling and scooters.
- Scooter routing must honor local legal access rules; do not silently treat all cycling routes as scooter-safe.
- Never fabricate routes by drawing a straight line between origin and destination.
- Protect credentials on the server and apply provider attribution/licensing.
- Cache only as appropriate; minimize retention of user location.
- Return a consistent GeoJSON-derived coordinate sequence and maneuvers, not fake turn instructions.
- Route ETA must use routing-provider duration when available; GPS-speed estimates are provisional.
- Provide graceful errors for unavailable profiles and failed routes.
- Test using Puerto Rico road topology and live device positioning before production.

## Current status
Only the browser client and unit tests exist in this branch. There is no implemented backend endpoint, no deployed integration, and no proof that the live application uses MapLibre.
