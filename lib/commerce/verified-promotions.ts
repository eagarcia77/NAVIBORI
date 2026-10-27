import type {CommerceProfile,CommercePromotion} from "./types";
import {isPromotionActive} from "./catalog";

/** Public map must never advertise synthetic, unverified or expired promotions.
 * Invalid publisher dates fail closed; the device clock is only used for
 * display filtering, not as proof that a merchant has fulfilled an offer.
 */
export function currentVerifiedPromotions(
  business:CommerceProfile|null,
  now:Date=new Date(),
  limit=2
):CommercePromotion[]{
  if(!business||business.demo||business.verification!=="verified"||
     !business.verifiedLocation||!business.mapLocation?.verified||
     !Number.isFinite(now.getTime()))return [];
  return business.promotions.filter(promotion=>
    promotion.title.trim() && isPromotionActive(promotion,now)
  ).slice(0,limit);
}
