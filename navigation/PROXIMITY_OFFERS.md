# NAVIBORI — Merchant proximity offers (v3.0)

## Merchant-managed promotion contract
Only use promotions that were explicitly created and approved by the merchant. Example:
```json
{
  "id": "merchant-123",
  "name": "Example merchant (illustrative)",
  "location": {"lat": 18.0, "lng": -66.0},
  "promotion": {
    "id": "promo-2026-001",
    "title": "Example offer",
    "startsAt": "2026-10-11T00:00:00Z",
    "endsAt": "2026-10-12T00:00:00Z"
  }
}
```
This is a schema example, not an actual merchant or offer.

## Wiring
```js
import {ProximityOffers} from "./proximity-offers.js";
const offers=new ProximityOffers({
  onOffer: offer => showInAppPromotion(offer)
});
// Only after explicit consent: offers.setConsent(true);
// Load active, merchant-verified promotions from the backend:
offers.setMerchants(merchantsWithVerifiedPromotions);
// Call from GPS tracking only while app is active:
offers.updatePosition(gpsPosition);
// If user disables promotional alerts: offers.setConsent(false);
```
`showInAppPromotion` is a UI integration placeholder.

## Release safeguards
- Implement a merchant dashboard with authorization and promotion ownership checks.
- Require a merchant-controlled title, offer ID, start and end time, and verified coordinates.
- Respect explicit marketing opt-in and allow withdrawal at any time.
- In-app alerts are distinct from OS-level push notifications. Background notifications require a separate push subscription, service worker, secure delivery backend and platform-specific validation.
- Never claim reliable background geofencing on mobile web browsers; iOS may suspend web GPS in the background.
- Store notification cooldowns server-side if cross-session suppression is required. This version only suppresses duplicates within the current JS instance.
- Limit message frequency, prevent deceptive offers, and avoid persisting raw GPS traces.
- Validate in physical devices and integrate with the real merchant API before deployment.
