# NAVIBORI Commerce Map Integration

The `CommerceMapAdapter` accepts normalized merchant records from `CommerceClient` and renders clickable MapLibre circle markers.

```js
import {CommerceClient} from "./commerce-client.js";
import {CommerceMapAdapter} from "./commerce-map-adapter.js";
const client=new CommerceClient();
const commerceMap=new CommerceMapAdapter(map,{
  onSelect: commerce => openMerchantSheet({
    commerce,
    onDirections: () => startNavigationTo(commerce.location)
  })
});
async function refreshNearby(userPosition) {
  const commerces=await client.nearby({position:userPosition,radiusMeters:2000});
  commerceMap.setCommerces(commerces);
}
map.on("style.load",()=>commerceMap.render());
// On view teardown: commerceMap.destroy();
```

The functions `openMerchantSheet` and `startNavigationTo` above are integration placeholders, not implemented in this module.

## Acceptance criteria
- Show verified merchant name and accessible selectable marker; offer must be verified and unexpired.
- Marker selection opens merchant details and directions action.
- Avoid fetching nearby merchants continuously on every GPS update; use explicit user search or throttled refresh with clear privacy disclosures.
- Re-render after map style changes and cleanup handlers when unmounting.
- Add keyboard-accessible merchant list because map canvas markers alone are insufficient for accessibility.
- Integrate into actual application only after locating its frontend and backend entry points.
- No production deployment or live GPS testing has been completed.
