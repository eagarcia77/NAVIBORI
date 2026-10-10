import {describe,expect,it} from "vitest";
import {
  buildOsrmRouteUrl,
  isPuertoRicoCoordinate,
  normalizeOsrmRoute,
  routingProviderBase,
  distanceBetweenCoordinates,
  shouldRefreshNavigationRoute,
  buildSpanishNavigationInstruction,
  getNextNavigationCue,
  distanceToRouteMeters,
  isOffNavigationRoute,
  hasArrivedAtDestination
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
    expect(url.searchParams.get("steps")).toBe("true");
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

  it("normalizes turn-by-turn steps and selects the next maneuver",()=>{
    const route=normalizeOsrmRoute({
      code:"Ok",
      routes:[{
        distance:850,
        duration:180,
        geometry:{
          type:"LineString",
          coordinates:[
            [-66.61,18.01],
            [-66.60,18.02],
            [-66.59,18.03]
          ]
        },
        legs:[{
          steps:[
            {
              distance:300,
              duration:60,
              name:"PR-1",
              maneuver:{
                type:"depart",
                modifier:"straight",
                location:[-66.61,18.01]
              }
            },
            {
              distance:500,
              duration:100,
              name:"Calle Comercio",
              maneuver:{
                type:"turn",
                modifier:"right",
                location:[-66.60,18.02]
              }
            },
            {
              distance:50,
              duration:20,
              name:"",
              maneuver:{
                type:"arrive",
                modifier:"right",
                location:[-66.59,18.03]
              }
            }
          ]
        }]
      }]
    },"driving");

    expect(route?.steps).toHaveLength(3);
    expect(route?.steps[1].instruction).toBe("Gira a la derecha en Calle Comercio.");
    expect(route ? getNextNavigationCue(route) : null).toMatchObject({
      instruction:"Gira a la derecha en Calle Comercio.",
      distanceMeters:300
    });
  });

  it("formats common Spanish maneuvers",()=>{
    expect(
      buildSpanishNavigationInstruction("continue","straight","PR-52",null)
    ).toBe("Continúa recto en PR-52.");
    expect(
      buildSpanishNavigationInstruction("roundabout","right","PR-14",2)
    ).toBe("En la rotonda toma la salida 2 en PR-14.");
    expect(
      buildSpanishNavigationInstruction("arrive",null,"",null)
    ).toBe("Has llegado a tu destino.");
  });

  it("detects off-route movement and arrival",()=>{
    const geometry={
      type:"LineString" as const,
      coordinates:[
        [-66.5000,18.0000],
        [-66.5000,18.0100]
      ] as [number,number][]
    };

    const route={
      mode:"walking" as const,
      distanceMeters:1000,
      durationSeconds:700,
      geometry,
      steps:[],
      provider:"OSRM / OpenStreetMap" as const
    };

    expect(
      distanceToRouteMeters({latitude:18.005,longitude:-66.5001},geometry)
    ).toBeLessThan(20);
    expect(
      isOffNavigationRoute(
        {latitude:18.005,longitude:-66.5010},
        route,
        5
      )
    ).toBe(true);
    expect(
      hasArrivedAtDestination(
        {latitude:18.0001,longitude:-66.5000},
        {latitude:18.0000,longitude:-66.5000},
        5
      )
    ).toBe(true);
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
