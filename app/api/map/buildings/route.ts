import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type LonLat={lat:number;lon:number};
type OverpassElement={
  type:string;
  id:number;
  tags?:Record<string,string>;
  geometry?:LonLat[];
};
type BuildingFeature={
  type:"Feature";
  id:string;
  properties:{height:number;base:number;estimated:boolean;levels:number|null};
  geometry:{type:"Polygon";coordinates:number[][][]};
};
type CacheRecord={expiresAt:number;features:BuildingFeature[]};
const cache=new Map<string,CacheRecord>();
const CACHE_MS=1000*60*30;
const MAX_CACHE_RECORDS=64;
const OVERPASS_ENDPOINTS=[
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
] as const;

function safeMeters(value:string|undefined){
  if(!value) return null;
  const text=value.trim().toLowerCase();
  if(!/^\d+(?:\.\d+)?\s*(?:m|metres?|meters?|ft|feet)?$/.test(text))return null;
  const amount=Number.parseFloat(text);
  if(!Number.isFinite(amount))return null;
  const converted=/\b(ft|feet)\b/.test(text)?amount*0.3048:amount;
  return converted>=0 && converted<=300?converted:null;
}

function buildingHeight(tags:Record<string,string>){
  const direct=safeMeters(tags["height"])??safeMeters(tags["building:height"]);
  const levels=Number.parseFloat(tags["building:levels"]??"");
  const validLevels=Number.isFinite(levels)&&levels>0&&levels<=100?levels:null;
  const estimated=direct===null;
  const height=Math.max(3,Math.min(300,direct??(validLevels!==null?validLevels*3:9)));
  const minHeight=safeMeters(tags["min_height"])??safeMeters(tags["building:min_height"])??0;
  return {height,base:Math.min(minHeight,Math.max(0,height-1)),estimated,levels:validLevels};
}

function toFeatures(elements:OverpassElement[]):BuildingFeature[]{
  const output:BuildingFeature[]=[];
  for(const entry of elements){
    if(entry.type!=="way"||!Number.isFinite(entry.id))continue;
    const tags=entry.tags??{};
    if(!tags["building"]||tags["building"]==="no"||tags["building"]==="roof")continue;
    const geometry=entry.geometry;
    if(!Array.isArray(geometry)||geometry.length<3||geometry.length>1500)continue;
    const ring=geometry.map(point=>[point.lon,point.lat]).filter(
      coords=>coords.length===2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]) &&
      Math.abs(coords[0])<=180 && Math.abs(coords[1])<=90
    );
    if(ring.length<3)continue;
    const first=ring[0],last=ring[ring.length-1];
    if(first[0]!==last[0]||first[1]!==last[1])ring.push([...first]);
    if(ring.length<4)continue;
    output.push({
      type:"Feature",id:"way/"+entry.id,properties:buildingHeight(tags),
      geometry:{type:"Polygon",coordinates:[ring]}
    });
  }
  return output;
}

function validBounds(url:URL){
  const values=["south","west","north","east"].map(key=>Number(url.searchParams.get(key)));
  const [south,west,north,east]=values;
  if(values.some(v=>!Number.isFinite(v))||Math.abs(south)>90||Math.abs(north)>90||
    Math.abs(west)>180||Math.abs(east)>180||
    north<=south||east<=west||
    north-south>0.035||east-west>0.035||
    north-south<0.00002||east-west<0.00002)return null;
  return {south,west,north,east};
}

export async function GET(request:NextRequest){
  const bounds=validBounds(request.nextUrl);
  if(!bounds){
    return NextResponse.json({error:"Invalid building map bounds."},{status:400});
  }
  const key=[bounds.south,bounds.west,bounds.north,bounds.east].map(v=>v.toFixed(4)).join(":");
  const now=Date.now();
  const previous=cache.get(key);
  if(previous && previous.expiresAt>now){
    return NextResponse.json({type:"FeatureCollection",features:previous.features,source:"osm",cached:true},
      {headers:{"Cache-Control":"public, max-age=120, stale-while-revalidate=600"}});
  }

  // Fetch only actual OpenStreetMap building footprints in the visible neighborhood.
  // This is unrelated to synthetic GPS DEMO commerce locations.
  const bbox=[bounds.south,bounds.west,bounds.north,bounds.east]
    .map(v=>v.toFixed(6)).join(",");
  const overpassQuery='[out:json][timeout:14];way["building"]('+bbox+');out geom 1800;';
  let lastError="Building provider unavailable";
  // Make provider failures discoverable from Render logs, without recording
  // exact device/GPS coordinates.
  const startedAt=Date.now();
  const viewportArea=(bounds.north-bounds.south)*(bounds.east-bounds.west);
  console.info("[navibori-3d] request area_degrees2="+viewportArea.toFixed(7));
  for(const endpoint of OVERPASS_ENDPOINTS){
    try{
      const response=await fetch(endpoint,{
        method:"POST",
        body:new URLSearchParams({data:overpassQuery}),
        headers:{
          "Content-Type":"application/x-www-form-urlencoded",
          "Accept":"application/json",
          "User-Agent":"NAVIBORI-3D/1.0 (OSM building-footprint visualization)"
        },
        signal:AbortSignal.timeout(16000),
        cache:"no-store"
      });
      if(!response.ok){
        lastError="Building provider HTTP "+response.status;
        console.warn("[navibori-3d] provider "+new URL(endpoint).host+" HTTP "+response.status);
        continue;
      }
      const text=await response.text();
      if(text.length>4_000_000){
        lastError="Building response too large";
        console.warn("[navibori-3d] provider "+new URL(endpoint).host+" exceeded response-size limit");
        continue;
      }
      const parsed=JSON.parse(text) as {elements?:OverpassElement[]};
      if(!Array.isArray(parsed.elements))continue;
      const features=toFeatures(parsed.elements).slice(0,1800);
      console.info(
        "[navibori-3d] success provider="+new URL(endpoint).host+
        " count="+features.length+
        " elapsed_ms="+(Date.now()-startedAt)
      );
      if(cache.size>=MAX_CACHE_RECORDS){
        const oldest=cache.keys().next().value;
        if(oldest!==undefined)cache.delete(oldest);
      }
      cache.set(key,{expiresAt:now+CACHE_MS,features});
      return NextResponse.json(
        {type:"FeatureCollection",features,source:"osm",cached:false},
        {headers:{
          "Cache-Control":"public, max-age=120, stale-while-revalidate=600",
          "X-Navibori-3D-Count":String(features.length),
          "X-Navibori-3D-Provider":new URL(endpoint).host
        }}
      );
    }catch(error){
      lastError=error instanceof Error?error.message:"Building request failed";
      console.warn(
        "[navibori-3d] provider "+new URL(endpoint).host+
        " failed "+lastError.slice(0,140)
      );
    }
  }
  console.error(
    "[navibori-3d] all providers failed after "+
    (Date.now()-startedAt)+" ms"
  );
  return NextResponse.json({error:"No se pudo consultar la geometría 3D.",detail:lastError},
    {status:503,headers:{"Cache-Control":"no-store"}});
}
