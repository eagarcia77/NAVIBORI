import {describe,it,expect} from "vitest";
import {publishedSpecials} from "./specials-feed";
import type {CommerceProfile} from "./types";
const now=new Date("2026-10-27T12:00:00Z");
const business={id:"b",name:"Comercio",slug:"comercio",demo:false,verification:"verified",verifiedLocation:true,
 mapLocation:{latitude:18,longitude:-66,verified:true,address:"PR"},
 promotions:[1,2,3].map(n=>({id:"p"+n,title:"Oferta "+n,description:"Vigente",active:true}))} as CommerceProfile;
describe("exact advertisement feed",()=>{
 it("returns the third requested offer even though the map shows only two",()=>{
  expect(publishedSpecials([business],null,now)).toHaveLength(2);
  expect(publishedSpecials([business],"p3",now).map(p=>p.id)).toEqual(["p3"]);
 });
 it("never substitutes another promotion for an unknown, expired or unverified one",()=>{
  expect(publishedSpecials([business],"missing",now)).toEqual([]);
  const expired={...business,promotions:business.promotions.map(p=>({...p,endsAt:"2026-10-26T00:00:00Z"}))};
  expect(publishedSpecials([expired],"p3",now)).toEqual([]);
  expect(publishedSpecials([{...business,verifiedLocation:false}],"p3",now)).toEqual([]);
 });
});
