import test from "node:test";
import assert from "node:assert/strict";
import { NavigationSession } from "./navigation-session.js";
const a={lat:18,lng:-66},b={lat:18.001,lng:-66};
function setup() {
 const states=[],calls=[];
 const tracker={lastPosition:a,setRoute:r=>calls.push(["trackerRoute",r]),start:()=>calls.push(["start"]),stop:()=>calls.push(["stop"])};
 const map={setRoute:r=>calls.push(["mapRoute",r]),updatePosition:p=>calls.push(["position",p])};
 const directions={route:async()=>({coordinates:[a,b],distanceMeters:120,durationSeconds:40})};
 const session=new NavigationSession({mapAdapter:map,directions,onState:s=>states.push(s),trackerFactory:()=>tracker});
 return {session,states,calls,tracker,directions};
}
test("starts tracking after route is loaded",async()=>{const x=setup();await x.session.start({origin:a,destination:b});assert.ok(x.calls.some(c=>c[0]==="start"));assert.ok(x.states.some(s=>s.type==="route"));});
test("position updates map and progress",async()=>{const x=setup();await x.session.start({origin:a,destination:b});x.session.handlePosition(a);assert.ok(x.states.some(s=>s.type==="position"&&s.progress));});
test("stop disables session",async()=>{const x=setup();await x.session.start({origin:a,destination:b});x.session.stop();assert.equal(x.session.active,false);});
test("routing failure reports error without tracking",async()=>{const x=setup();x.directions.route=async()=>{throw Error("offline")};await x.session.start({origin:a,destination:b});assert.ok(x.states.some(s=>s.type==="error"));assert.ok(!x.calls.some(c=>c[0]==="start"));});
test("reroute updates route",async()=>{const x=setup();await x.session.start({origin:a,destination:b});await x.session.reroute();assert.ok(x.states.some(s=>s.type==="rerouting"));});
