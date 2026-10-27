import {it,expect} from "vitest";
import {isPromotionActive} from "./catalog";
import {currentVerifiedPromotions} from "./verified-promotions";
import type {CommerceProfile,CommercePromotion} from "./types";
it("uses exclusive expiry and fails closed for invalid intervals on every surface",()=>{
 const now=new Date("2026-10-27T12:00:00Z");
 for(const dates of [{endsAt:now.toISOString()},{startsAt:"invalid"},{endsAt:"invalid"},{startsAt:now.toISOString(),endsAt:now.toISOString()}]){
  const p={id:"p",title:"A",active:true,...dates} as CommercePromotion;
  expect(isPromotionActive(p,now)).toBe(false);
  expect(currentVerifiedPromotions({verification:"verified",verifiedLocation:true,mapLocation:{verified:true},promotions:[p]} as CommerceProfile,now)).toEqual([]);
 }
 expect(isPromotionActive({active:true} as CommercePromotion,new Date("invalid"))).toBe(false);
 expect(isPromotionActive({active:true,startsAt:now.toISOString()} as CommercePromotion,now)).toBe(true);
});
