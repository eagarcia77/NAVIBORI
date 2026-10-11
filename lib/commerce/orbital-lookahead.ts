import {
  distanceBetweenCoordinates,
  type InMapRouteMode,
  type InMapRouteResult,
  type RoutingCoordinate
} from "./in-map-routing";

export interface OrbitalLookahead{
  coordinate:RoutingCoordinate;
  lookaheadMeters:number;
  routeDistanceMeters:number;
}

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

export function orbitalLookaheadDistance(
  mode:InMapRouteMode,
  speedKph:number|null,
  nextManeuverMeters:number|null
){
  const speed=
    typeof speedKph==="number" && Number.isFinite(speedKph)
      ? Math.max(0,speedKph)
      : 0;

  const config={
    driving:{min:55,max:420,seconds:8,base:120},
    cycling:{min:35,max:180,seconds:6,base:70},
    scooter:{min:30,max:160,seconds:6,base:60},
    walking:{min:18,max:75,seconds:4,base:30}
  }[mode];

  const speedProjection=speed/3.6*config.seconds;
  let distance=clamp(
    Math.max(config.base,speedProjection),
    config.min,
    config.max
  );

  if(
    typeof nextManeuverMeters==="number" &&
    Number.isFinite(nextManeuverMeters) &&
    nextManeuverMeters>=0
  ){
    const maneuverTarget=Math.max(
      mode==="walking" ? 10 : 16,
      nextManeuverMeters*0.82
    );
    distance=Math.min(distance,maneuverTarget);
  }

  return Math.max(8,distance);
}

export function coordinateAtRouteDistance(
  route:InMapRouteResult,
  routeDistanceMeters:number
):RoutingCoordinate|null{
  const coordinates=route.geometry.coordinates;
  if(coordinates.length===0) return null;
  if(coordinates.length===1){
    return {
      longitude:coordinates[0][0],
      latitude:coordinates[0][1]
    };
  }

  const target=clamp(
    routeDistanceMeters,
    0,
    Math.max(0,route.distanceMeters)
  );

  let accumulated=0;

  for(let index=1;index<coordinates.length;index+=1){
    const [aLon,aLat]=coordinates[index-1];
    const [bLon,bLat]=coordinates[index];
    const a={latitude:aLat,longitude:aLon};
    const b={latitude:bLat,longitude:bLon};
    const segment=distanceBetweenCoordinates(a,b);

    if(segment<=0) continue;

    if(accumulated+segment>=target){
      const t=clamp((target-accumulated)/segment,0,1);
      return {
        latitude:a.latitude+(b.latitude-a.latitude)*t,
        longitude:a.longitude+(b.longitude-a.longitude)*t
      };
    }

    accumulated+=segment;
  }

  const last=coordinates[coordinates.length-1];
  return {longitude:last[0],latitude:last[1]};
}

export function buildOrbitalLookahead(
  route:InMapRouteResult,
  traveledMeters:number,
  mode:InMapRouteMode,
  speedKph:number|null,
  nextManeuverMeters:number|null
):OrbitalLookahead|null{
  const lookaheadMeters=orbitalLookaheadDistance(
    mode,
    speedKph,
    nextManeuverMeters
  );

  const routeDistanceMeters=clamp(
    Math.max(0,traveledMeters)+lookaheadMeters,
    0,
    route.distanceMeters
  );

  const coordinate=coordinateAtRouteDistance(
    route,
    routeDistanceMeters
  );

  if(!coordinate) return null;

  return {
    coordinate,
    lookaheadMeters,
    routeDistanceMeters
  };
}
