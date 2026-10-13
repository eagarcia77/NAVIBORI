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
    typeof value.license==="string"&&Boolean(value.tiles)&&typeof value.tiles==="object"&&
    !Array.isArray(value.tiles)&&
    value.bbox[0]>=-180&&value.bbox[2]<=180&&
    value.bbox[1]>=-90&&value.bbox[3]<=90&&
    value.bbox[0]<value.bbox[2]&&value.bbox[1]<value.bbox[3]&&
    (value.bbox[2]-value.bbox[0])/value.step<=1000&&
    (value.bbox[3]-value.bbox[1])/value.step<=1000;
}

export function visibleNovaSceneTileIds(
  manifest:NovaSceneManifest,viewport:SpatialBBox,padding=0.0015
):string[]{
  if(!validNovaSceneManifest(manifest)||
    ![viewport.west,viewport.south,viewport.east,viewport.north,padding].every(Number.isFinite)||
    viewport.west>viewport.east||viewport.south>viewport.north||
    padding<0||padding>0.1)return [];
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

/** Prevent malformed tile payloads from reaching the MapLibre extrusion renderer. */
export function validNovaSceneTile(data:unknown):data is NovaSceneCollection{
  if(!data||typeof data!=="object")return false;
  const tile=data as Partial<NovaSceneCollection>;
  if(tile.type!=="FeatureCollection"||!Array.isArray(tile.features))return false;
  const validPosition=(point:unknown):boolean=>
    Array.isArray(point)&&point.length>=2&&
    typeof point[0]==="number"&&Number.isFinite(point[0])&&
    typeof point[1]==="number"&&Number.isFinite(point[1])&&
    point[0]>=-180&&point[0]<=180&&point[1]>=-90&&point[1]<=90;
  const validRing=(ring:unknown):boolean=>
    Array.isArray(ring)&&ring.length>=4&&ring.every(validPosition)&&
    (ring[0] as number[])[0]===(ring[ring.length-1] as number[])[0]&&
    (ring[0] as number[])[1]===(ring[ring.length-1] as number[])[1];
  const validPolygon=(polygon:unknown):boolean=>
    Array.isArray(polygon)&&polygon.length>0&&polygon.every(validRing);
  return tile.features.every(feature=>{
    if(!feature||feature.type!=="Feature"||!feature.geometry||
      !feature.properties)return false;
    const {height,base,estimated}=feature.properties;
    if(typeof height!=="number"||!Number.isFinite(height)||height<=0||
      typeof base!=="number"||!Number.isFinite(base)||base<0||
      typeof estimated!=="boolean")return false;
    const geometry=feature.geometry;
    return geometry.type==="Polygon"
      ?validPolygon(geometry.coordinates)
      :geometry.type==="MultiPolygon"&&
        Array.isArray(geometry.coordinates)&&geometry.coordinates.length>0&&
        geometry.coordinates.every(validPolygon);
  });
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
