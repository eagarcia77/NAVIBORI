import test from "node:test";
import assert from "node:assert/strict";
import {buildGoogleDirectionsUrl,validRouteCoordinate} from "./directions";

test("builds driving directions with destination and optional origin",()=>{
  const url=new URL(buildGoogleDirectionsUrl(
    {latitude:18.05,longitude:-66.50},
    "driving",
    {latitude:18.01,longitude:-66.61}
  ));
  assert.equal(url.searchParams.get("destination"),"18.05,-66.5");
  assert.equal(url.searchParams.get("origin"),"18.01,-66.61");
  assert.equal(url.searchParams.get("travelmode"),"driving");
  assert.equal(url.searchParams.get("dir_action"),"navigate");
});

test("supports walking and validates coordinate bounds",()=>{
  const url=new URL(buildGoogleDirectionsUrl({latitude:18.05,longitude:-66.50},"walking"));
  assert.equal(url.searchParams.get("origin"),null);
  assert.equal(url.searchParams.get("travelmode"),"walking");
  assert.equal(validRouteCoordinate({latitude:18.05,longitude:-66.50}),true);
  assert.equal(validRouteCoordinate({latitude:181,longitude:-66.50}),false);
});
