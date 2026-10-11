import test from "node:test";
import assert from "node:assert/strict";
import {MerchantJourney} from "./merchant-journey.js";
import {CommerceDiscovery} from "./commerce-discovery.js";
import {NavigationSession} from "./navigation-session.js";
const origin={lat:18,lng:-66},merchant={id:"m1",name:"Merchant",location:{lat:18.01,lng:-66.01}};
function setup(){
 const calls=[],events=[];
 const discovery=new CommerceDiscovery({client:{nearby:async()=>[merchant]},mapAdapter:{setCommerces:()=>{}}});
 const navigation=new NavigationSession({
  mapAdapter:{setRoute:()=>{},updatePosition:()=>{}},
  directions:{route:async input=>{calls.push(input);return {coordinates:[origin,merchant.location],distanceMeters:1000,durationSeconds:180};}},
  trackerFactory:()=>({setRoute:()=>{},start:()=>{},stop:()=>{}})});
 const journey=new MerchantJourney({discovery,navigation,onState:s=>events.push(s)});
 return {journey,calls,events};
}
test("find and select merchant",async()=>{const x=setup();await x.journey.findNearby(origin);assert.equal(x.journey.chooseCommerce("m1").name,"Merchant");});
test("directions use selected merchant coordinates",async()=>{const x=setup();await x.journey.findNearby(origin);x.journey.chooseCommerce("m1");await x.journey.navigateToSelected();assert.deepEqual(x.calls[0].destination,merchant.location);});
test("mode passes through to directions",async()=>{const x=setup();await x.journey.findNearby(origin);x.journey.chooseCommerce("m1");x.journey.setTransportMode("walking");await x.journey.navigateToSelected();assert.equal(x.calls[0].mode,"walking");});
test("cannot navigate without merchant",async()=>{const x=setup();await x.journey.findNearby(origin);assert.equal(await x.journey.navigateToSelected(),false);assert.equal(x.calls.length,0);});
test("invalid mode is rejected",()=>{const x=setup();assert.throws(()=>x.journey.setTransportMode("helicopter"),RangeError);});
