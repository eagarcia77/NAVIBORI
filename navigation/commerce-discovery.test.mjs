import test from "node:test";
import assert from "node:assert/strict";
import {CommerceDiscovery} from "./commerce-discovery.js";
const a={id:"a",name:"A",location:{lat:18,lng:-66}},b={id:"b",name:"B",location:{lat:18.1,lng:-66.1}};
function setup(client={nearby:async()=>[a,b]}){const states=[],pins=[];const discovery=new CommerceDiscovery({client,mapAdapter:{setCommerces:c=>pins.push(c)},onState:s=>states.push(s)});return {discovery,states,pins};}
test("loads verified merchant results into map",async()=>{const x=setup();await x.discovery.search(a.location);assert.equal(x.pins[0].length,2);});
test("selects only a returned merchant",async()=>{const x=setup();await x.discovery.search(a.location);assert.equal(x.discovery.select("b").id,"b");assert.equal(x.discovery.select("missing"),null);});
test("removes selection if merchant disappears",async()=>{let list=[a,b];const x=setup({nearby:async()=>list});await x.discovery.search(a.location);x.discovery.select("b");list=[a];await x.discovery.search(a.location);assert.equal(x.discovery.selected,null);});
test("keeps existing pins on failed refresh",async()=>{let fail=false;const x=setup({nearby:async()=>{if(fail)throw Error("offline");return [a];}});await x.discovery.search(a.location);fail=true;await x.discovery.search(a.location);assert.equal(x.pins.length,1);assert.ok(x.states.some(s=>s.type==="search-error"));});
test("ignores late results after destroy",async()=>{let finish;const x=setup({nearby:()=>new Promise(resolve=>finish=resolve)});const pending=x.discovery.search(a.location);x.discovery.destroy();finish([a]);await pending;assert.equal(x.pins.length,0);});
