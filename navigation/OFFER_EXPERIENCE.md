# NAVIBORI — In-app proximity notification integration

## Flow
1. Merchant creates a verified, time-bounded promotion through authenticated backend.
2. App retrieves nearby merchants and currently approved promotions.
3. User explicitly enables nearby promotional alerts.
4. Foreground GPS fixes call `experience.onGpsFix({lat,lng,accuracyMeters})`.
5. `ProximityOffers` verifies radius, GPS accuracy, expiry and cooldown.
6. `PromotionInbox` stores one item per merchant/offer pair during the current session.
7. Host UI renders the inbox and optional nonblocking notice; clicking the offer opens merchant details.

## Example
```js
import {OfferExperience} from "./offer-experience.js";
const experience = new OfferExperience({
  onNotice: event => {
    if(event.type === "promotion") renderPromotionToast(event.offer);
  }
});
experience.setMerchants(merchantsWithVerifiedPromotions);
// Only in direct response to a user opt-in:
experience.setConsent(true);
// From an already-running, foreground GPS tracker:
experience.onGpsFix(position);
// When the user opts out:
experience.setConsent(false);
```
`renderPromotionToast` is a placeholder implemented by the host application.

## Not yet implemented
- Rendered UI and real merchant backend
- Persistent notification history and consent storage
- Native push notifications and reliable background geofencing
- Production GPS/device verification and Render deployment

Do not request browser notification permission without explicit user action. Never send raw GPS coordinates to merchants. Promotional notices must not obscure turn-by-turn navigation instructions.
