import {describe,it,expect} from "vitest";
import {nearbyPromotions} from "./nearby-promotions";
import type {CommerceProfile} from "./types";
const now=Date.now();
const position={latitude:18,longitude:-66,accuracy:10,timestamp:now};
const business={id:"b",name:"Comercio",slug:"comercio",demo:false,verification:"verified",verifiedLocation:true,
 mapLocation:{latitude:18,longitude:-66,verified:true,address:"PR"},
 promotions:[{id:"p",title:"Oferta",description:"Descuento",active:true}]} as CommerceProfile;
describe("nearby offers",()=>{
 it("shows a verified nearby offer and excludes distant places",()=>{
  expect(nearbyPromotions([business],position,1000,now)).toHaveLength(1);
  expect(nearbyPromotions([business],{...position,latitude:19},1000,now)).toHaveLength(0);
 });
 it("rejects stale, inaccurate and invalid locations",()=>{
  for(const p of [{...position,timestamp:now-130000},{...position,accuracy:500},{...position,latitude:NaN}])
   expect(nearbyPromotions([business],p,1000,now)).toEqual([]);
 });
 it("excludes demo, unverified and expired ads",()=>{
  for(const b of [{...business,demo:true},{...business,verifiedLocation:false},
   {...business,promotions:[{...business.promotions[0],endsAt:new Date(now-1000).toISOString()}]}])
   expect(nearbyPromotions([b],position,1000,now)).toEqual([]);
 });
 it("uses GPS uncertainty conservatively at the radius boundary",()=>{
  expect(nearbyPromotions([business],{...position,accuracy:200},100,now)).toEqual([]);
 });
});
