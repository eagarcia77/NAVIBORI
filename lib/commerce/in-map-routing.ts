export type InMapRouteMode="driving"|"walking";

export interface RoutingCoordinate{
  latitude:number;
  longitude:number;
}

export interface RouteGeometry{
  type:"LineString";
  coordinates:[number,number][];
}

export interface InMapRouteResult{
  mode:InMapRouteMode;
  distanceMeters:number;
  durationSeconds:number;
  geometry:RouteGeometry;
  provider:"OSRM / OpenStreetMap";
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
    "?overview=full&geometries=geojson&steps=false&alternatives=false";
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
    provider:"OSRM / OpenStreetMap"
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
