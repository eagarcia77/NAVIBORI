export type InMapRouteMode="driving"|"walking";

export interface RoutingCoordinate{
  latitude:number;
  longitude:number;
}

export interface RouteGeometry{
  type:"LineString";
  coordinates:[number,number][];
}

export interface NavigationStep{
  instruction:string;
  type:string;
  modifier:string|null;
  name:string;
  distanceMeters:number;
  durationSeconds:number;
  location:RoutingCoordinate|null;
  exit:number|null;
}

export interface NavigationCue{
  instruction:string;
  distanceMeters:number;
  step:NavigationStep;
}

export interface InMapRouteResult{
  mode:InMapRouteMode;
  distanceMeters:number;
  durationSeconds:number;
  geometry:RouteGeometry;
  steps:NavigationStep[];
  provider:"OSRM / OpenStreetMap";
}

interface OsrmManeuver{
  location?:unknown;
  type?:unknown;
  modifier?:unknown;
  exit?:unknown;
}

interface OsrmStep{
  distance?:unknown;
  duration?:unknown;
  name?:unknown;
  maneuver?:OsrmManeuver;
}

export interface OsrmRouteResponse{
  code?:string;
  message?:string;
  routes?:Array<{
    distance?:number;
    duration?:number;
    geometry?:{
      type?:string;
      coordinates?:unknown;
    };
    legs?:Array<{
      steps?:OsrmStep[];
    }>;
  }>;
}

export function isPuertoRicoCoordinate(value:RoutingCoordinate){
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude>=17.5 &&
    value.latitude<=18.7 &&
    value.longitude>=-67.5 &&
    value.longitude<=-65.0
  );
}

export function routingProviderBase(mode:InMapRouteMode){
  return mode==="walking"
    ? "https://routing.openstreetmap.de/routed-foot"
    : "https://routing.openstreetmap.de/routed-car";
}

export function buildOsrmRouteUrl(
  origin:RoutingCoordinate,
  destination:RoutingCoordinate,
  mode:InMapRouteMode
){
  const coordinates=[
    origin.longitude+","+origin.latitude,
    destination.longitude+","+destination.latitude
  ].join(";");

  return routingProviderBase(mode)+
    "/route/v1/driving/"+
    coordinates+
    "?overview=full&geometries=geojson&steps=true&alternatives=false";
}

function parseCoordinates(input:unknown):[number,number][]|null{
  if(!Array.isArray(input) || input.length<2) return null;

  const coordinates:[number,number][]=[];
  for(const item of input){
    if(
      !Array.isArray(item) ||
      item.length<2 ||
      typeof item[0]!=="number" ||
      typeof item[1]!=="number" ||
      !Number.isFinite(item[0]) ||
      !Number.isFinite(item[1])
    ){
      return null;
    }
    coordinates.push([item[0],item[1]]);
  }
  return coordinates;
}

function parseManeuverLocation(input:unknown):RoutingCoordinate|null{
  if(
    !Array.isArray(input) ||
    input.length<2 ||
    typeof input[0]!=="number" ||
    typeof input[1]!=="number" ||
    !Number.isFinite(input[0]) ||
    !Number.isFinite(input[1])
  ){
    return null;
  }

  return {
    longitude:input[0],
    latitude:input[1]
  };
}

function roadSuffix(name:string){
  const clean=name.trim();
  return clean ? " en "+clean : "";
}

function directionLabel(modifier:string|null){
  switch(modifier){
    case "left": return "a la izquierda";
    case "right": return "a la derecha";
    case "slight left": return "ligeramente a la izquierda";
    case "slight right": return "ligeramente a la derecha";
    case "sharp left": return "pronunciadamente a la izquierda";
    case "sharp right": return "pronunciadamente a la derecha";
    case "uturn": return "en U";
    case "straight": return "recto";
    default: return modifier ? "hacia "+modifier : "";
  }
}

export function buildSpanishNavigationInstruction(
  type:string,
  modifier:string|null,
  name:string,
  exit:number|null
){
  const direction=directionLabel(modifier);
  const road=roadSuffix(name);

  switch(type){
    case "depart":
      return name ? "Comienza por "+name+"." : "Comienza la ruta.";
    case "arrive":
      return "Has llegado a tu destino.";
    case "turn":
      return direction ? "Gira "+direction+road+"." : "Gira"+road+".";
    case "continue":
      return direction && direction!=="recto"
        ? "Continúa "+direction+road+"."
        : "Continúa recto"+road+".";
    case "new name":
      return name ? "Continúa por "+name+"." : "Continúa por la vía.";
    case "merge":
      return direction ? "Incorpórate "+direction+road+"." : "Incorpórate"+road+".";
    case "on ramp":
      return direction ? "Toma la entrada "+direction+road+"." : "Toma la entrada"+road+".";
    case "off ramp":
      return direction ? "Toma la salida "+direction+road+"." : "Toma la salida"+road+".";
    case "fork":
      return direction ? "En la bifurcación mantente "+direction+road+"." : "Continúa por la bifurcación"+road+".";
    case "end of road":
      return direction ? "Al final de la vía gira "+direction+road+"." : "Continúa al final de la vía"+road+".";
    case "roundabout":
    case "rotary":
      return exit
        ? "En la rotonda toma la salida "+exit+road+"."
        : "Entra a la rotonda"+road+".";
    case "roundabout turn":
      return direction ? "En la rotonda gira "+direction+road+"." : "Continúa por la rotonda"+road+".";
    case "exit roundabout":
      return exit ? "Sal de la rotonda por la salida "+exit+road+"." : "Sal de la rotonda"+road+".";
    case "notification":
      return name ? "Continúa por "+name+"." : "Continúa por la ruta.";
    default:
      return direction ? "Continúa "+direction+road+"." : "Continúa"+road+".";
  }
}

function normalizeSteps(route:NonNullable<OsrmRouteResponse["routes"]>[number]){
  const steps:NavigationStep[]=[];

  for(const leg of route.legs ?? []){
    for(const raw of leg.steps ?? []){
      const distance=
        typeof raw.distance==="number" && Number.isFinite(raw.distance)
          ? Math.max(0,raw.distance)
          : 0;
      const duration=
        typeof raw.duration==="number" && Number.isFinite(raw.duration)
          ? Math.max(0,raw.duration)
          : 0;
      const name=typeof raw.name==="string" ? raw.name.trim() : "";
      const type=
        typeof raw.maneuver?.type==="string"
          ? raw.maneuver.type.toLowerCase()
          : "turn";
      const modifier=
        typeof raw.maneuver?.modifier==="string"
          ? raw.maneuver.modifier.toLowerCase()
          : null;
      const exit=
        typeof raw.maneuver?.exit==="number" && Number.isFinite(raw.maneuver.exit)
          ? raw.maneuver.exit
          : null;

      steps.push({
        instruction:buildSpanishNavigationInstruction(type,modifier,name,exit),
        type,
        modifier,
        name,
        distanceMeters:distance,
        durationSeconds:duration,
        location:parseManeuverLocation(raw.maneuver?.location),
        exit
      });
    }
  }

  return steps;
}

export function normalizeOsrmRoute(
  input:OsrmRouteResponse,
  mode:InMapRouteMode
):InMapRouteResult|null{
  if(input.code!=="Ok") return null;
  const route=input.routes?.[0];
  if(!route) return null;

  if(
    typeof route.distance!=="number" ||
    !Number.isFinite(route.distance) ||
    route.distance<0 ||
    typeof route.duration!=="number" ||
    !Number.isFinite(route.duration) ||
    route.duration<0 ||
    route.geometry?.type!=="LineString"
  ){
    return null;
  }

  const coordinates=parseCoordinates(route.geometry.coordinates);
  if(!coordinates) return null;

  return {
    mode,
    distanceMeters:route.distance,
    durationSeconds:route.duration,
    geometry:{
      type:"LineString",
      coordinates
    },
    steps:normalizeSteps(route),
    provider:"OSRM / OpenStreetMap"
  };
}

export function getNextNavigationCue(
  route:InMapRouteResult
):NavigationCue|null{
  if(route.steps.length===0) return null;

  const nextIndex=route.steps.findIndex((step)=>step.type!=="depart");

  if(nextIndex<0){
    return {
      instruction:route.steps[0].instruction,
      distanceMeters:0,
      step:route.steps[0]
    };
  }

  const distanceMeters=route.steps
    .slice(0,nextIndex)
    .reduce((total,step)=>total+step.distanceMeters,0);

  return {
    instruction:route.steps[nextIndex].instruction,
    distanceMeters,
    step:route.steps[nextIndex]
  };
}

const EARTH_RADIUS_METERS=6371008.8;

function toRadians(value:number){
  return value*Math.PI/180;
}

export function distanceBetweenCoordinates(
  a:RoutingCoordinate,
  b:RoutingCoordinate
){
  const lat1=toRadians(a.latitude);
  const lat2=toRadians(b.latitude);
  const deltaLat=lat2-lat1;
  const deltaLon=toRadians(b.longitude-a.longitude);

  const sinLat=Math.sin(deltaLat/2);
  const sinLon=Math.sin(deltaLon/2);
  const h=
    sinLat*sinLat+
    Math.cos(lat1)*Math.cos(lat2)*sinLon*sinLon;

  return 2*EARTH_RADIUS_METERS*Math.asin(Math.min(1,Math.sqrt(h)));
}

function projectMeters(
  point:RoutingCoordinate,
  referenceLatitude:number
){
  const latitudeRadians=toRadians(point.latitude);
  const longitudeRadians=toRadians(point.longitude);
  const refLatitudeRadians=toRadians(referenceLatitude);

  return {
    x:EARTH_RADIUS_METERS*longitudeRadians*Math.cos(refLatitudeRadians),
    y:EARTH_RADIUS_METERS*latitudeRadians
  };
}

export function distanceToRouteMeters(
  point:RoutingCoordinate,
  geometry:RouteGeometry
){
  if(geometry.coordinates.length<2) return Number.POSITIVE_INFINITY;

  const refLatitude=point.latitude;
  const p=projectMeters(point,refLatitude);
  let minimum=Number.POSITIVE_INFINITY;

  for(let index=1;index<geometry.coordinates.length;index+=1){
    const [aLon,aLat]=geometry.coordinates[index-1];
    const [bLon,bLat]=geometry.coordinates[index];

    const a=projectMeters({latitude:aLat,longitude:aLon},refLatitude);
    const b=projectMeters({latitude:bLat,longitude:bLon},refLatitude);
    const abX=b.x-a.x;
    const abY=b.y-a.y;
    const lengthSquared=abX*abX+abY*abY;

    let t=0;
    if(lengthSquared>0){
      t=((p.x-a.x)*abX+(p.y-a.y)*abY)/lengthSquared;
      t=Math.max(0,Math.min(1,t));
    }

    const nearestX=a.x+t*abX;
    const nearestY=a.y+t*abY;
    const dx=p.x-nearestX;
    const dy=p.y-nearestY;
    minimum=Math.min(minimum,Math.hypot(dx,dy));
  }

  return minimum;
}

export function isOffNavigationRoute(
  point:RoutingCoordinate,
  route:InMapRouteResult,
  accuracyMeters:number|null
){
  const accuracy=
    typeof accuracyMeters==="number" && Number.isFinite(accuracyMeters)
      ? Math.max(0,accuracyMeters)
      : 0;
  const threshold=Math.max(45,Math.min(90,accuracy*1.5));

  return distanceToRouteMeters(point,route.geometry)>threshold;
}

export function hasArrivedAtDestination(
  point:RoutingCoordinate,
  destination:RoutingCoordinate,
  accuracyMeters:number|null
){
  const accuracy=
    typeof accuracyMeters==="number" && Number.isFinite(accuracyMeters)
      ? Math.max(0,accuracyMeters)
      : 0;
  const threshold=Math.max(25,Math.min(55,accuracy*1.25));

  return distanceBetweenCoordinates(point,destination)<=threshold;
}

export function shouldRefreshNavigationRoute(
  previous:RoutingCoordinate|null,
  current:RoutingCoordinate,
  lastRefreshAt:number,
  now:number
){
  if(!previous) return true;

  const moved=distanceBetweenCoordinates(previous,current);
  const elapsed=Math.max(0,now-lastRefreshAt);

  return (
    (elapsed>=12000 && moved>=25) ||
    (elapsed>=45000 && moved>=8)
  );
}
