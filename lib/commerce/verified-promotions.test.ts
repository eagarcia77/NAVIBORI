import {describe,it,expect} from "vitest";
import {currentVerifiedPromotions} from "./verified-promotions";
import type {CommerceProfile} from "./types";
const business={
  id:"verified",slug:"verified",name:"Verified shop",category:"compras",
  description:"",locationLabel:"Puerto Rico",verifiedLocation:true,
  mapLocation:{latitude:18.052,longitude:-66.506,address:"Verified address",verified:true},
  hours:[],offers:[],tags:[],verification:"verified",demo:false,
  promotions:[
    {id:"valid",title:"Descuento vigente",description:"",active:true,
      startsAt:"2026-01-01T00:00:00Z",endsAt:"2026-12-31T23:59:59Z"},
    {id:"expired",title:"Expiró",description:"",active:true,
      endsAt:"2025-12-31T23:59:59Z"},
    {id:"future",title:"Futura",description:"",active:true,
      startsAt:"2027-01-01T00:00:00Z"},
    {id:"bad",title:"Inválida",description:"",active:true,startsAt:"not-a-date"},
    {id:"off",title:"Inactiva",description:"",active:false}
  ]
} satisfies CommerceProfile;
const now=new Date("2026-10-14T12:00:00Z");
describe("verified public commerce promotions",()=>{
  it("shows only active valid offers within their date window",()=>{
    expect(currentVerifiedPromotions(business,now).map(p=>p.id)).toEqual(["valid"]);
  });
  it("never advertises demos, unverified locations or merchants",()=>{
    expect(currentVerifiedPromotions({...business,demo:true},now)).toEqual([]);
    expect(currentVerifiedPromotions({...business,verification:"pending"},now)).toEqual([]);
    expect(currentVerifiedPromotions({...business,verifiedLocation:false},now)).toEqual([]);
    expect(currentVerifiedPromotions({...business,mapLocation:{...business.mapLocation,verified:false}},now)).toEqual([]);
  });
  it("rejects expired, future, invalid and inactive offers",()=>{
    expect(currentVerifiedPromotions({...business,promotions:business.promotions.slice(1)},now)).toEqual([]);
  });
});
