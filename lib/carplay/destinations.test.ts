import {describe,expect,it} from "vitest";
import {toCarPlayDestinations} from "./destinations";
import type {CommerceProfile} from "@/lib/commerce/types";

function business(partial:Partial<CommerceProfile>={}):CommerceProfile{
  return {
    id:"merchant1",name:"Café",slug:"cafe",category:"gastronomia",
    description:"",locationLabel:"Juana Díaz",verifiedLocation:true,
    verification:"verified",demo:false,
    mapLocation:{latitude:18.05,longitude:-66.51,address:"Calle Principal",verified:true},
    hours:[],offers:[],promotions:[],tags:[],...partial
  };
}
describe("Native CarPlay commercial destinations",()=>{
  it("only exports live verified locations from Puerto Rico",()=>{
    const result=toCarPlayDestinations([
      business(),business({id:"demo",demo:true}),
      business({id:"unverified",verifiedLocation:false}),
      business({id:"unverifiedCoordinates",mapLocation:{latitude:18.05,longitude:-66.51,address:"",verified:false}}),
      business({id:"outsidePR",mapLocation:{latitude:40,longitude:-73,address:"NY",verified:true}})
    ]);
    expect(result).toEqual([{id:"merchant1",name:"Café",category:"gastronomia",
      address:"Calle Principal",latitude:18.05,longitude:-66.51}]);
  });
  it("keeps the feed empty before first verified merchant",()=>{
    expect(toCarPlayDestinations([])).toEqual([]);
  });
});
