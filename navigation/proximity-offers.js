/** Opt-in, foreground-only proximity offers. No automatic push subscription. */
import { NavigationTracker } from "./navigation-core.js";
const valid=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
const validDate=value=>typeof value==="string"&&Number.isFinite(Date.parse(value));
export function eligibleOffer(merchant,now=Date.now()) {
  const offer=merchant?.promotion;
  if(!merchant||typeof merchant.id!=="string"||!valid(merchant.location)||!offer||
     typeof offer.id!=="string"||!offer.id.trim()||typeof offer.title!=="string"||!offer.title.trim()||
     !validDate(offer.startsAt)||!validDate(offer.endsAt)) return false;
  const start=Date.parse(offer.startsAt),end=Date.parse(offer.endsAt);
  return start<=now&&now<end&&start<end;
}
export class ProximityOffers {
  constructor({onOffer=()=>{},radiusMeters=150,cooldownMs=6*60*60*1000,now=()=>Date.now()}={}) {
    if(!Number.isFinite(radiusMeters)||radiusMeters<30||radiusMeters>500) throw new RangeError("Invalid radius");
    if(!Number.isFinite(cooldownMs)||cooldownMs<60000) throw new RangeError("Invalid cooldown");
    this.onOffer=onOffer;this.radiusMeters=radiusMeters;this.cooldownMs=cooldownMs;this.now=now;
    this.enabled=false;this.merchants=[];this.lastSent=new Map();this.inside=new Set();
  }
  setConsent(enabled) {
    this.enabled=enabled===true;
    if(!this.enabled) {this.inside.clear();this.lastSent.clear();}
  }
  setMerchants(merchants) {
    if(!Array.isArray(merchants)||merchants.length>500) throw new TypeError("Invalid merchant list");
    this.merchants=merchants.filter(m=>m&&valid(m.location)&&typeof m.id==="string");
    const ids=new Set(this.merchants.map(m=>m.id));
    for(const key of this.inside) if(!ids.has(key.split(":")[0])) this.inside.delete(key);
  }
  updatePosition(position) {
    if(!this.enabled||!valid(position)||!Number.isFinite(position.accuracyMeters)||position.accuracyMeters>50) return [];
    const now=this.now(),out=[];
    for(const merchant of this.merchants) {
      const distance=NavigationTracker.distanceMeters(position,merchant.location);
      const inside=distance<=this.radiusMeters;
      const offerKey=merchant.id+":"+(merchant.promotion?.id||"");
      const wasInside=this.inside.has(offerKey);
      if(!inside) {if(distance>this.radiusMeters+50)for(const key of this.inside) if(key.startsWith(merchant.id+":")) this.inside.delete(key);continue;}
      if(!eligibleOffer(merchant,now)||wasInside) continue;
      const key=offerKey;
      const last=this.lastSent.get(key);
      if(last!==undefined&&now-last<this.cooldownMs) {this.inside.add(offerKey);continue;}
      this.lastSent.set(key,now);this.inside.add(offerKey);
      const message={merchantId:merchant.id,merchantName:merchant.name,offerId:merchant.promotion.id,
        title:merchant.promotion.title,expiresAt:merchant.promotion.endsAt,distanceMeters:Math.round(distance)};
      out.push(message);this.onOffer(message);
    }
    return out;
  }
}
