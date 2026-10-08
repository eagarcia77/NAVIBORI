import {describe,expect,it} from "vitest";
import {
  buildOsrmRouteUrl,
  isPuertoRicoCoordinate,
  normalizeOsrmRoute,
  routingProviderBase,
  distanceBetweenCoordinates,
  shouldRefreshNavigationRoute
} from "./in-map-routing";

describe("in-map commerce routing",()=>{
  it("selects car and foot routing services",()=>{
    expect(routingProviderBase("driving")).toContain("routed-car");
    expect(routingProviderBase("walking")).toContain("routed-foot");
  });

  it("builds an OSRM GeoJSON route URL with lon-lat coordinate order",()=>{
    const url=new URL(buildOsrmRouteUrl(
      {latitude:18.01,longitude:-66.61},
      {latitude:18.05,longitude:-66.50},
      "driving"
    ));

    expect(url.pathname).toContain(
      "/routed-car/route/v1/driving/-66.61,18.01;-66.5,18.05"
    );
    expect(url.searchParams.get("overview")).toBe("full");
    expect(url.searchParams.get("geometries")).toBe("geojson");
  });

  it("restricts the public routing proxy to Puerto Rico",()=>{
    expect(isPuertoRicoCoordinate({latitude:18.2,longitude:-66.4})).toBe(true);
    expect(isPuertoRicoCoordinate({latitude:40.7,longitude:-74})).toBe(false);
  });

  it("normalizes distance duration and LineString geometry",()=>{
    const route=normalizeOsrmRoute({
      code:"Ok",
      routes:[{
        distance:3218.6,
        duration:455,
        geometry:{
          type:"LineString",
          coordinates:[
            [-66.61,18.01],
            [-66.55,18.03],
            [-66.50,18.05]
          ]
        }
      }]
    },"walking");

    expect(route?.mode).toBe("walking");
    expect(route?.distanceMeters).toBe(3218.6);
    expect(route?.durationSeconds).toBe(455);
    expect(route?.geometry.coordinates).toHaveLength(3);
  });

  it("measures movement and throttles live GPS rerouting",()=>{
    const start={latitude:18.0000,longitude:-66.5000};
    const moved={latitude:18.0004,longitude:-66.5000};

    expect(distanceBetweenCoordinates(start,moved)).toBeGreaterThan(40);
    expect(
      shouldRefreshNavigationRoute(start,moved,1000,14000)
    ).toBe(true);
    expect(
      shouldRefreshNavigationRoute(start,moved,1000,5000)
    ).toBe(false);
    expect(
      shouldRefreshNavigationRoute(null,moved,0,1000)
    ).toBe(true);
  });

  it("rejects malformed routing responses",()=>{
    expect(normalizeOsrmRoute({code:"NoRoute",routes:[]},"driving")).toBe(null);
    expect(normalizeOsrmRoute({
      code:"Ok",
      routes:[{
        distance:10,
        duration:20,
        geometry:{type:"Point",coordinates:[-66.5,18.0]}
      }]
    },"driving")).toBe(null);
  });
});
