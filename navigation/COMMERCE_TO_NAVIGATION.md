# NAVIBORI — Commerce to Navigation Flow

## Intended application wiring
```js
import { CommerceDiscovery } from "./commerce-discovery.js";
import { CommerceMapAdapter } from "./commerce-map-adapter.js";
import { NavigationSession } from "./navigation-session.js";
import { NavigationMapAdapter } from "./map-adapter.js";

const navigationMap = new NavigationMapAdapter(map);
const navigation = new NavigationSession({
  mapAdapter: navigationMap,
  onState: state => renderNavigationState(state)
});
let discovery;
const commerceMap = new CommerceMapAdapter(map,{
  onSelect: commerce => discovery.select(commerce.id)
});
discovery = new CommerceDiscovery({
  mapAdapter: commerceMap,
  onState: state => renderCommerceState(state)
});
async function searchCommerces(userPosition) {
  await discovery.search(userPosition,{radiusMeters:2000});
}
async function directionsToSelected(userPosition,mode) {
  if(!discovery.selected) return;
  await navigation.start({
    origin:userPosition,
    destination:discovery.selected.location,
    mode
  });
}
```

`renderNavigationState` and `renderCommerceState` are **host-application integration placeholders**; they are not implemented by these modules.

## Requirements before release
- Implement the same-origin `/api/commerces/nearby` and `/api/directions` backend endpoints.
- Confirm that the real app uses MapLibre or adapt the mapping layer to its actual provider.
- Attach a merchant details sheet with an accessible "Directions" action and mode picker.
- Show a commerce list for screen readers and keyboard navigation.
- GPS permission must be requested in context; do not start continuous location tracking on page load.
- Use verified merchant data only, and do not advertise expired promotions.
- Do not claim real-time traffic or scooter-safe routing without corresponding provider support.
- Validate on physical iPhone and Android devices, including GPS-denied and offline states.
- No live deployment is implied by the presence of this integration example.
