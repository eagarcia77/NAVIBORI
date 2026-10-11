# NAVIBORI Map Integration — Phase 2.3

## Scope
The MapLibre adapter draws a route supplied by a routing engine and follows GPS updates. It **does not** calculate legal roads, fetch businesses, implement voice guidance or operate in the background.

## Wiring example
```js
import { NavigationTracker } from "./navigation-core.js";
import { NavigationMapAdapter } from "./map-adapter.js";
const adapter = new NavigationMapAdapter(map);
const tracker = new NavigationTracker({
  onPosition: point => adapter.updatePosition(point),
  onStatus: status => console.info("GPS status", status),
  onDeviation: async ({position}) => {
    // Call your server-side routing provider, respecting transport mode.
    // const updated = await getDirections(position, destination, mode);
    // tracker.setRoute(updated.coordinates);
    // adapter.setRoute(updated.coordinates);
  }
});
map.on("style.load", () => adapter.renderRoute());
map.on("dragstart", () => adapter.setFollow(false));
// When user taps recenter: adapter.setFollow(true);
function beginNavigation(routeFromProvider) {
  tracker.setRoute(routeFromProvider);
  adapter.setRoute(routeFromProvider);
  tracker.start();
}
function endNavigation() { tracker.stop(); adapter.destroy(); }
```

## Production requirements
- MapLibre GL JS must be loaded by the host app, with licensed map tiles and valid attribution.
- Routing must be provided by a routing engine (e.g. OSRM/Valhalla/GraphHopper) with mode-specific access rules; scooter support requires an explicit legal profile.
- MapLibre style reloads may remove the route layer; re-add via style.load.
- Ensure routing API credentials stay on the server when required.
- HTTPS, geolocation permission and foreground operation are required for reliable web GPS. iOS may suspend tracking in background.
- Test screen-reader labels, 44px+ touch targets, voice prompt timing, driving safety and device locale.
- Do not notify users about promotions without opt-in and frequency controls.
- The app's actual source entry point is still unidentified; this module is not yet integrated or deployed.

## Local tests
```sh
cd navigation
npm test
```
