import {describe,expect,it} from "vitest";
import {buildGoogleDirectionsUrl,validRouteCoordinate} from "./directions";

describe("commerce directions",()=>{
  it("builds driving directions with destination and optional origin",()=>{
  const url=new URL(buildGoogleDirectionsUrl(
    {latitude:18.05,longitude:-66.50},
    "driving",
    {latitude:18.01,longitude:-66.61}
  ));
  expect(url.searchParams.get("destination")).toBe("18.05,-66.5");
  expect(url.searchParams.get("origin")).toBe("18.01,-66.61");
  expect(url.searchParams.get("travelmode")).toBe("driving");
  expect(url.searchParams.get("dir_action")).toBe("navigate");
  });

  it("supports walking and validates coordinate bounds",()=>{
  const url=new URL(buildGoogleDirectionsUrl({latitude:18.05,longitude:-66.50},"walking"));
  expect(url.searchParams.get("origin")).toBe(null);
  expect(url.searchParams.get("travelmode")).toBe("walking");
  expect(validRouteCoordinate({latitude:18.05,longitude:-66.50})).toBe(true);
  expect(validRouteCoordinate({latitude:181,longitude:-66.50})).toBe(false);
  });
});
