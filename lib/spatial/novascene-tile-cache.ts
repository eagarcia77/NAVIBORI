/** NovaScene 2.1 — pure, testable spatial coverage and deduplication. */
export type NovaSceneFeature={
  type:"Feature";
  id?:string|number;
  properties:{height:number;base:number;estimated:boolean};
  geometry:{
    type:"Polygon"|"MultiPolygon";
    coordinates:number[][][]|number[][][][];
  };
};
export type NovaSceneCollection={
  type:"FeatureCollection";
  features:NovaSceneFeature[];
};
export type NovaSceneManifest={
  version:2;
  bbox:[number,number,number,number];
  step:number;
  uniqueBuildings:number;
  attribution:string;
  license:string;
  tiles:Record<string,{path:string;count:number}>;
};
export type SpatialBBox={west:number;south:number;east:number;north:number};

export function validNovaSceneManifest(data:unknown):data is NovaSceneManifest{
  if(!data||typeof data!=="object")return false;
  const value=data as Partial<NovaSceneManifest>;
  return value.version===2&&Array.isArray(value.bbox)&&value.bbox.length===4&&
    value.bbox.every(v=>typeof v==="number"&&Number.isFinite(v))&&
    typeof value.step==="number"&&value.step>0&&value.step<=0.05&&
    typeof value.uniqueBuildings==="number"&&value.uniqueBuildings>100&&
    typeof value.license==="string"&&Boolean(value.tiles)&&typeof value.tiles==="object";
}

export function visibleNovaSceneTileIds(
  manifest:NovaSceneManifest,viewport:SpatialBBox,padding=0.0015
):string[]{
  const [west,south,east,north]=manifest.bbox;
  const xCount=Math.ceil((east-west)/manifest.step);
  const yCount=Math.ceil((north-south)/manifest.step);
  const x1=Math.max(0,Math.floor((viewport.west-padding-west)/manifest.step));
  const x2=Math.min(xCount-1,Math.floor((viewport.east+padding-west)/manifest.step));
  const y1=Math.max(0,Math.floor((viewport.south-padding-south)/manifest.step));
  const y2=Math.min(yCount-1,Math.floor((viewport.north+padding-south)/manifest.step));
  const result:string[]=[];
  for(let x=x1;x<=x2;x++){
    for(let y=y1;y<=y2;y++){
      const key=x+"-"+y;
      if(Object.prototype.hasOwnProperty.call(manifest.tiles,key))result.push(key);
    }
  }
  return result;
}

export function mergeNovaSceneFeatures(collections:NovaSceneCollection[]):NovaSceneCollection{
  const seen=new Set<string>();
  const features:NovaSceneFeature[]=[];
  for(const collection of collections){
    for(const feature of collection.features){
      const id=feature.id===undefined
        ? JSON.stringify(feature.geometry.coordinates)
        : String(feature.id);
      if(seen.has(id))continue;
      seen.add(id);
      features.push(feature);
    }
  }
  return {type:"FeatureCollection",features};
}

export function newTileFetchCache(maxEntries=64){
  const values=new Map<string,NovaSceneCollection>();
  return {
    get(key:string){
      const result=values.get(key);
      if(result){
        values.delete(key);
        values.set(key,result);
      }
      return result;
    },
    set(key:string,value:NovaSceneCollection){
      values.delete(key);
      values.set(key,value);
      while(values.size>maxEntries){
        const old=values.keys().next().value;
        if(old!==undefined)values.delete(old);
      }
    },
    size:()=>values.size
  };
}
