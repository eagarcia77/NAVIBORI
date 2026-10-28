import {it,expect,vi} from "vitest";
import {deliverNearbyOffer} from "./nearby-delivery";
import {nearbyPromotions} from "./nearby-promotions";
import type {CommerceProfile} from "./types";
it("cancels a pending notification when visibility or consent is withdrawn",async()=>{
  let allow=true;let resume!:()=>void;
  const ready=new Promise<void>(resolve=>{resume=resolve;});
  const show=vi.fn(async()=>{});const record=vi.fn();
  const task=deliverNearbyOffer({ready:()=>ready,allowed:()=>allow,offers:()=>[1],eligible:()=>true,show,record});
  allow=false;resume();await task;
  expect(show).not.toHaveBeenCalled();expect(record).not.toHaveBeenCalled();
});
it("rechecks offer expiry and stale GPS after worker preparation",async()=>{
  const start=Date.parse("2026-10-27T12:00:00Z");
  const business={name:"A",slug:"a",verification:"verified",verifiedLocation:true,mapLocation:{latitude:18,longitude:-66,verified:true},promotions:[{id:"p",title:"A",active:true,endsAt:new Date(start+1000).toISOString()}]} as CommerceProfile;
  for(const delay of [1000,130000]){
    let now=start;
    const show=vi.fn(async()=>{});
    await deliverNearbyOffer({ready:async()=>{now+=delay;},allowed:()=>true,offers:()=>nearbyPromotions([business],{latitude:18,longitude:-66,accuracy:1,timestamp:start},1000,now),eligible:()=>true,show,record:()=>{}});
    expect(show).not.toHaveBeenCalled();
  }
});
it("records cooldown only after successful display and sends one eligible offer",async()=>{
  const record=vi.fn();const show=vi.fn(async()=>{});
  const options={ready:async()=>{},allowed:()=>true,offers:()=>[1,2,3],eligible:(n:number)=>n>1,show,record};
  await deliverNearbyOffer(options);expect(show).toHaveBeenCalledExactlyOnceWith(2);expect(record).toHaveBeenCalledExactlyOnceWith(2);
  record.mockClear();show.mockRejectedValueOnce(new Error("blocked"));
  await expect(deliverNearbyOffer(options)).rejects.toThrow("blocked");expect(record).not.toHaveBeenCalled();
});
