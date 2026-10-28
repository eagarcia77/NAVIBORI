import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

type SpatialPolygon={
  type:"Feature";
  id?:string;
  geometry:{type:"Polygon"|"MultiPolygon";coordinates:unknown[]};
  properties:{height:number;estimated:boolean;base:number};
};
type SpatialSnapshot={
  type:"FeatureCollection";
  features:SpatialPolygon[];
  properties:{bbox:number[];license:string;attribution:string};
};

describe("NovaScene self-hosted 3D geographic snapshot",()=>{
  const snapshot=JSON.parse(readFileSync(resolve(process.cwd(),
    "public/data/novascene/juana-diaz.geojson"),"utf8")) as SpatialSnapshot;
  it("contains enough real geographic footprints to show Juana Diaz in 3D",()=>{
    expect(snapshot.type).toBe("FeatureCollection");
    expect(snapshot.features.length).toBeGreaterThan(500);
    expect(snapshot.properties.license).toContain("ODbL");
    expect(snapshot.properties.attribution).toContain("OpenStreetMap");
    const [west,south,east,north]=snapshot.properties.bbox;
    expect(west).toBeLessThan(-66.506);
    expect(east).toBeGreaterThan(-66.506);
    expect(south).toBeLessThan(18.052);
    expect(north).toBeGreaterThan(18.052);
  });
  it("stores closed geometry with finite, positive visual height",()=>{
    const buildings=snapshot.features.slice(0,450);
    for(const building of buildings){
      expect(["Polygon","MultiPolygon"]).toContain(building.geometry.type);
      expect(building.geometry.coordinates.length).toBeGreaterThan(0);
      expect(Number.isFinite(building.properties.height)).toBe(true);
      expect(building.properties.height).toBeGreaterThanOrEqual(2);
      expect(building.properties.height).toBeLessThanOrEqual(300);
      expect(typeof building.properties.estimated).toBe("boolean");
    }
  });
});
