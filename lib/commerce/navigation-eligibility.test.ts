import {describe,expect,it} from "vitest";
import {canNavigateCommerce,canHandoffCommerceDirections} from "./navigation-eligibility";
import type {CommerceProfile} from "./types";

function business(overrides:Partial<CommerceProfile>={}):CommerceProfile{
  return {
    id:"b1",
    name:"Comercio",
    slug:"comercio",
    category:"servicios",
    description:"Demo",
    locationLabel:"Puerto Rico",
    verifiedLocation:false,
    mapLocation:{
      latitude:18.05,
      longitude:-66.50,
      address:"Puerto Rico",
      verified:false
    },
    hours:[],
    offers:[],
    promotions:[],
    tags:[],
    verification:"unverified",
    demo:true,
    ...overrides
  };
}

describe("commerce navigation eligibility",()=>{
  it("allows valid DEMO destinations only in demo source",()=>{
    const demo=business();
    expect(canNavigateCommerce(demo,"demo")).toBe(true);
    expect(canNavigateCommerce(demo,"live")).toBe(false);
  });

  it("requires fully verified LIVE destinations",()=>{
    const live=business({
      demo:false,
      verifiedLocation:true,
      verification:"verified",
      mapLocation:{
        latitude:18.05,
        longitude:-66.50,
        address:"Puerto Rico",
        verified:true
      }
    });

    expect(canNavigateCommerce(live,"live")).toBe(true);
  });

  it("never hands fictional demo coordinates to Apple Maps / CarPlay",()=>{
    expect(canHandoffCommerceDirections(business(),"demo")).toBe(false);
    expect(canHandoffCommerceDirections(business(),"live")).toBe(false);

    const live=business({
      demo:false,
      verifiedLocation:true,
      verification:"verified",
      mapLocation:{latitude:18.05,longitude:-66.50,address:"Verified",verified:true}
    });
    expect(canHandoffCommerceDirections(live,"live")).toBe(true);
    expect(canHandoffCommerceDirections(live,"demo")).toBe(false);
    expect(canHandoffCommerceDirections({
      ...live,mapLocation:{...live.mapLocation!,verified:false}
    },"live")).toBe(false);
  });

  it("rejects unverified or invalid LIVE destinations",()=>{
    const unverified=business({demo:false});
    expect(canNavigateCommerce(unverified,"live")).toBe(false);

    const invalid=business({
      demo:false,
      verifiedLocation:true,
      mapLocation:{
        latitude:999,
        longitude:-66.50,
        address:"Puerto Rico",
        verified:true
      }
    });
    expect(canNavigateCommerce(invalid,"live")).toBe(false);
  });
});
