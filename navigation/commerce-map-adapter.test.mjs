import test from "node:test";
import assert from "node:assert/strict";
import {CommerceMapAdapter} from "./commerce-map-adapter.js";
function mockMap() {
 const sources=new Map(),layers=new Map(),handlers=new Map();
 return {sources,layers,handlers,isStyleLoaded:()=>true,
 addSource:(id,obj)=>sources.set(id,{...obj,setData(data){this.data=data;}}),
 getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),
 addLayer:obj=>layers.set(obj.id,obj),getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),
 on:(event,layer,fn)=>handlers.set(event+layer,fn),off:(event,layer)=>handlers.delete(event+layer)};
}
const commerce={id:"shop1",name:"Sample",location:{lat:18,lng:-66}};
test("renders commerce pins",()=>{const m=mockMap(),a=new CommerceMapAdapter(m);a.setCommerces([commerce]);assert.equal(m.sources.size,1);assert.equal(m.layers.size,1);});
test("selects a commerce by ID",()=>{const m=mockMap();let selected;const a=new CommerceMapAdapter(m,{onSelect:c=>selected=c});a.setCommerces([commerce]);m.handlers.get("clicknavibori-commerce-circles")({features:[{properties:{commerceId:"shop1"}}]});assert.equal(selected.id,"shop1");});
test("ignores unknown commerce IDs",()=>{const m=mockMap();let count=0;const a=new CommerceMapAdapter(m,{onSelect:()=>count++});a.setCommerces([commerce]);m.handlers.get("clicknavibori-commerce-circles")({features:[{properties:{commerceId:"unknown"}}]});assert.equal(count,0);});
test("rejects invalid coordinates",()=>{const a=new CommerceMapAdapter(mockMap());assert.throws(()=>a.setCommerces([{...commerce,location:{lat:95,lng:0}}]),TypeError);});
test("destroy removes pins and listener",()=>{const m=mockMap(),a=new CommerceMapAdapter(m);a.setCommerces([commerce]);a.destroy();assert.equal(m.sources.size,0);assert.equal(m.handlers.size,0);});
