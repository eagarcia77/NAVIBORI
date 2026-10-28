import {describe,expect,it} from "vitest";
import {
  COMMERCE_MAP_REFRESH_MS,
  shouldRefreshCommerceMap
} from "./live-map-refresh";

describe("live commerce map refresh",()=>{
  it("uses a reasonable one-minute refresh cadence",()=>{
    expect(COMMERCE_MAP_REFRESH_MS).toBe(60_000);
  });

  it("refreshes only while visible and outside active GPS navigation",()=>{
    expect(
      shouldRefreshCommerceMap({
        visibility:"visible",
        gpsActive:false,
        inFlight:false
      })
    ).toBe(true);

    expect(
      shouldRefreshCommerceMap({
        visibility:"hidden",
        gpsActive:false,
        inFlight:false
      })
    ).toBe(false);

    expect(
      shouldRefreshCommerceMap({
        visibility:"visible",
        gpsActive:true,
        inFlight:false
      })
    ).toBe(false);

    expect(
      shouldRefreshCommerceMap({
        visibility:"visible",
        gpsActive:false,
        inFlight:true
      })
    ).toBe(false);
  });
});
