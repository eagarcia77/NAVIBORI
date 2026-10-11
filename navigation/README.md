# NAVIBORI Navigation Core v2

Independent ES module for browser geolocation. This is **not yet integrated into the deployed NAVIBORI app**.

## Capabilities
- High-accuracy watchPosition tracking and position callbacks.
- GPS permission, timeout and unavailable statuses.
- Speed, heading and horizontal accuracy when supported.
- Distance-to-polyline deviation detection with GPS accuracy filtering and 15-second cooldown.
- Spanish/English device-language preference.

## Integration
```js
import { NavigationTracker, preferredNavigationLanguage } from "./navigation/navigation-core.js";
const tracker = new NavigationTracker({
  route: [{lat:18.0,lng:-66.5},{lat:18.001,lng:-66.501}],
  onPosition: point => updateMapMarker(point),
  onStatus: status => updateGpsIndicator(status),
  onDeviation: () => requestFreshRoute()
});
tracker.start();
// On navigation end or component cleanup: tracker.stop();
```

The route coordinates above are illustrative only. A production routing API must calculate legal travel paths for driving, walking, cycling, or scooters. A route renderer must draw the route polyline; this module does not provide routing, voice, background tracking, notifications or turn-by-turn directions.

## Acceptance checks
1. Verify HTTPS, GPS permission and iOS Safari foreground operation.
2. Test denied permissions, unavailable signal and GPS timeouts.
3. Confirm marker moves on a real device and stop() clears the watch.
4. Verify deviation callbacks only when reliable fixes leave the route.
5. Integrate with existing map, routing backend, localization and UI; test on real roads without interacting with the phone while driving.
