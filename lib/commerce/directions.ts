export type DirectionsMode="driving"|"walking";

export interface RouteCoordinate{
  latitude:number;
  longitude:number;
}

export function buildGoogleDirectionsUrl(
  destination:RouteCoordinate,
  mode:DirectionsMode,
  origin?:RouteCoordinate
){
  const params=new URLSearchParams({
    api:"1",
    destination:destination.latitude+","+destination.longitude,
    travelmode:mode,
    dir_action:"navigate"
  });

  if(origin){
    params.set("origin",origin.latitude+","+origin.longitude);
  }

  return "https://www.google.com/maps/dir/?"+params.toString();
}

export function validRouteCoordinate(value:RouteCoordinate|undefined|null){
  return Boolean(
    value &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude>=-90 &&
    value.latitude<=90 &&
    value.longitude>=-180 &&
    value.longitude<=180
  );
}
