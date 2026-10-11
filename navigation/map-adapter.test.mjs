import test from "node:test";
import assert from "node:assert/strict";
import { NavigationMapAdapter } from "./map-adapter.js";
function mockMap() {
 const sources=new Map(),layers=new Map(),calls=[];
 return {sources,layers,calls,isStyleLoaded:()=>true,
 addSource:(id,obj)=>sources.set(id,{...obj,setData(data){this.data=data;}}),
 getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),
 addLayer:obj=>layers.set(obj.id,obj),getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),
 easeTo:camera=>calls.push(camera)};
}
test("renders provider route as GeoJSON line",()=>{const m=mockMap(),a=new NavigationMapAdapter(m);a.setRoute([{lat:18,lng:-66},{lat:18.1,lng:-66.1}]);assert.equal(m.sources.size,1);assert.equal(m.layers.size,1);});
test("position moves camera when following",()=>{const m=mockMap(),a=new NavigationMapAdapter(m);a.updatePosition({lat:18,lng:-66,headingDegrees:90});assert.equal(m.calls[0].bearing,90);});
test("manual exploration disables camera follow",()=>{const m=mockMap(),a=new NavigationMapAdapter(m);a.setFollow(false);a.updatePosition({lat:18,lng:-66});assert.equal(m.calls.length,0);});
test("rejects invalid route coordinates",()=>{const a=new NavigationMapAdapter(mockMap());assert.throws(()=>a.setRoute([{lat:91,lng:0}]),TypeError);});
test("cleanup removes map layers",()=>{const m=mockMap(),a=new NavigationMapAdapter(m);a.setRoute([{lat:18,lng:-66},{lat:18.1,lng:-66.1}]);a.destroy();assert.equal(m.sources.size,0);assert.equal(m.layers.size,0);});
