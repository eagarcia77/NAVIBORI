import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {
  visibleNovaSceneTileIds,
  mergeNovaSceneFeatures,
  newTileFetchCache,
  validNovaSceneManifest,
  validNovaSceneTile,
  type NovaSceneManifest,
  type NovaSceneCollection
} from "./novascene-tile-cache";

const folder=resolve(process.cwd(),"public/data/novascene/tiles");
const manifest=JSON.parse(readFileSync(resolve(folder,"manifest-v2.json"),"utf8")) as NovaSceneManifest;
const load=(key:string):NovaSceneCollection=>{
  const descriptor=manifest.tiles[key];
  return JSON.parse(readFileSync(resolve(process.cwd(),"public",descriptor.path.slice(1)),"utf8"));
};
describe("NovaScene 2.1 expanded tile coverage",()=>{
  it("publishes geographic coverage significantly larger than the original footprint map",()=>{
    expect(validNovaSceneManifest(manifest)).toBe(true);
    expect(manifest.uniqueBuildings).toBeGreaterThan(7512);
    expect(Object.keys(manifest.tiles).length).toBeGreaterThan(45);
    expect(manifest.license).toContain("ODbL");
    expect(manifest.bbox[0]).toBeLessThan(-66.531);
    expect(manifest.bbox[1]).toBeLessThan(18.037);
    expect(manifest.bbox[2]).toBeGreaterThan(-66.486);
    expect(manifest.bbox[3]).toBeGreaterThan(18.068);
  });
  it("rejects invalid manifests before loading 3D tile grids",()=>{
    expect(validNovaSceneManifest({...manifest,bbox:[-66.4,18,-66.6,18.1]})).toBe(false);
    expect(validNovaSceneManifest({...manifest,bbox:[-200,18,-66,19]})).toBe(false);
    expect(validNovaSceneManifest({...manifest,step:0.00001,bbox:[-66,18,-65,19]})).toBe(false);
    expect(validNovaSceneManifest({...manifest,tiles:[]})).toBe(false);
  });
  it("does not load tiles for invalid device viewport coordinates",()=>{
    expect(visibleNovaSceneTileIds(manifest,{west:NaN,south:18,east:-66,north:19})).toEqual([]);
    expect(visibleNovaSceneTileIds(manifest,{west:-66,south:19,east:-67,north:18})).toEqual([]);
    expect(visibleNovaSceneTileIds(manifest,{west:-66,south:18,east:-65,north:19},-1)).toEqual([]);
  });
  it("rejects broken building rings, invalid heights, and invalid positions",()=>{
    const polygon={type:"Feature",properties:{height:8,base:0,estimated:true},
      geometry:{type:"Polygon",coordinates:[[[-66.5,18.05],[-66.49,18.05],
        [-66.49,18.06],[-66.5,18.05]]]}};
    expect(validNovaSceneTile({type:"FeatureCollection",features:[polygon]})).toBe(true);
    expect(validNovaSceneTile({type:"FeatureCollection",features:[
      {...polygon,properties:{height:NaN,base:0,estimated:true}}
    ]})).toBe(false);
    expect(validNovaSceneTile({type:"FeatureCollection",features:[
      {...polygon,geometry:{type:"Polygon",coordinates:[[[-66.5,18.05],
        [-66.49,18.05],[-66.49,18.06]]]}}
    ]})).toBe(false);
    expect(validNovaSceneTile({type:"FeatureCollection",features:[
      {...polygon,geometry:{type:"Polygon",coordinates:[[[200,18.05],
        [-66.49,18.05],[-66.49,18.06],[200,18.05]]]}}
    ]})).toBe(false);
  });
  it("retains every unique real footprint even when it crosses cell boundaries",()=>{
    const ids=new Set<string>();
    let repeated=0;
    for(const [key,tile] of Object.entries(manifest.tiles)){
      const data=load(key);
      expect(data.type).toBe("FeatureCollection");
      expect(validNovaSceneTile(data)).toBe(true);
      expect(data.features.length).toBe(tile.count);
      for(const feature of data.features){
        const id=String(feature.id);
        if(ids.has(id))repeated++;
        ids.add(id);
        expect(feature.properties.height).toBeGreaterThan(0);
        expect(["Polygon","MultiPolygon"]).toContain(feature.geometry.type);
      }
    }
    expect(ids.size).toBe(manifest.uniqueBuildings);
    expect(repeated).toBeGreaterThan(0);
  });
  it("selects all local cells touching a GPS viewport, even outside legacy boundaries",()=>{
    const inside=visibleNovaSceneTileIds(manifest,{
      west:-66.506,south:18.049,east:-66.5,north:18.056
    });
    const extended=visibleNovaSceneTileIds(manifest,{
      west:-66.554,south:18.072,east:-66.548,north:18.081
    });
    expect(inside.length).toBeGreaterThan(0);
    expect(extended.length).toBeGreaterThan(0);
    const expected=extended.flatMap(load);
    expect(expected.length).toBeGreaterThan(0);
  });
  it("deduplicates boundary-crossing buildings without arbitrary first-2500 truncation",()=>{
    const ids=visibleNovaSceneTileIds(manifest,{
      west:-66.53,south:18.035,east:-66.49,north:18.061
    });
    const all=mergeNovaSceneFeatures(ids.map(load));
    expect(all.features.length).toBeGreaterThan(2500);
    expect(new Set(all.features.map(f=>String(f.id))).size).toBe(all.features.length);
    const cache=newTileFetchCache(2);
    cache.set("a",load(ids[0]));
    cache.set("b",load(ids[1]));
    cache.get("a");
    cache.set("c",load(ids[2]));
    expect(cache.get("b")).toBeUndefined();
    expect(cache.size()).toBe(2);
  });
});
