import type {CommerceProfile,CommercePromotion} from "./types";

/** Public map must never advertise synthetic, unverified or expired promotions.
 * Invalid publisher dates fail closed; the device clock is only used for
 * display filtering, not as proof that a merchant has fulfilled an offer.
 */
export function currentVerifiedPromotions(
  business:CommerceProfile|null,
  now:Date=new Date()
):CommercePromotion[]{
  if(!business||business.demo||business.verification!=="verified"||
     !business.verifiedLocation||!business.mapLocation?.verified||
     !Number.isFinite(now.getTime()))return [];
  const current=now.getTime();
  return business.promotions.filter(promotion=>{
    if(!promotion.active||!promotion.title.trim())return false;
    const start=promotion.startsAt?Date.parse(promotion.startsAt):null;
    const end=promotion.endsAt?Date.parse(promotion.endsAt):null;
    if(start!==null&&!Number.isFinite(start))return false;
    if(end!==null&&!Number.isFinite(end))return false;
    if(start!==null&&end!==null&&start>end)return false;
    return (start===null||start<=current)&&(end===null||current<=end);
  }).slice(0,2);
}
