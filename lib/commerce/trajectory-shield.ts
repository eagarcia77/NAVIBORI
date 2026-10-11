import {
  distanceToRouteMeters,
  type InMapRouteMode,
  type InMapRouteResult,
  type RoutingCoordinate
} from "./in-map-routing";

export type TrajectoryRisk="stable"|"watch"|"warning";

export interface TrajectoryPrediction{
  futureCoordinate:RoutingCoordinate;
  horizonSeconds:number;
  projectedMeters:number;
  currentDistanceFromRouteMeters:number;
  futureDistanceFromRouteMeters:number;
  thresholdMeters:number;
  risk:TrajectoryRisk;
}

const EARTH_RADIUS_METERS=6371008.8;

function toRadians(value:number){
  return value*Math.PI/180;
}

function toDegrees(value:number){
  return value*180/Math.PI;
}

function normalizeLongitude(value:number){
  return ((value+540)%360)-180;
}

export function projectCoordinate(
  origin:RoutingCoordinate,
  bearingDegrees:number,
  distanceMeters:number
):RoutingCoordinate{
  const angular=Math.max(0,distanceMeters)/EARTH_RADIUS_METERS;
  const bearing=toRadians(bearingDegrees);
  const lat1=toRadians(origin.latitude);
  const lon1=toRadians(origin.longitude);

  const lat2=Math.asin(
    Math.sin(lat1)*Math.cos(angular)+
    Math.cos(lat1)*Math.sin(angular)*Math.cos(bearing)
  );
  const lon2=lon1+Math.atan2(
    Math.sin(bearing)*Math.sin(angular)*Math.cos(lat1),
    Math.cos(angular)-Math.sin(lat1)*Math.sin(lat2)
  );

  return {
    latitude:toDegrees(lat2),
    longitude:normalizeLongitude(toDegrees(lon2))
  };
}

export function trajectoryHorizonSeconds(
  mode:InMapRouteMode,
  speedKph:number
){
  const speed=Math.max(0,speedKph);
  const base={
    driving:6,
    cycling:5,
    scooter:5,
    walking:4
  }[mode];

  if(mode==="driving" && speed>=70) return 7;
  if(mode!=="walking" && speed<=8) return Math.max(3,base-1);
  return base;
}

export function buildTrajectoryPrediction(
  route:InMapRouteResult,
  current:RoutingCoordinate,
  bearingDegrees:number|null,
  speedKph:number|null,
  accuracyMeters:number|null
):TrajectoryPrediction|null{
  if(
    typeof bearingDegrees!=="number" ||
    !Number.isFinite(bearingDegrees) ||
    typeof speedKph!=="number" ||
    !Number.isFinite(speedKph) ||
    speedKph<2
  ){
    return null;
  }

  const horizonSeconds=trajectoryHorizonSeconds(route.mode,speedKph);
  const maxProjection={
    driving:180,
    cycling:85,
    scooter:75,
    walking:30
  }[route.mode];
  const projectedMeters=Math.min(
    maxProjection,
    Math.max(4,(speedKph/3.6)*horizonSeconds)
  );
  const futureCoordinate=projectCoordinate(
    current,
    bearingDegrees,
    projectedMeters
  );

  const accuracy=
    typeof accuracyMeters==="number" && Number.isFinite(accuracyMeters)
      ? Math.max(0,accuracyMeters)
      : 0;
  const thresholdMeters=Math.max(
    28,
    Math.min(70,accuracy*1.25)
  );

  const currentDistanceFromRouteMeters=distanceToRouteMeters(
    current,
    route.geometry
  );
  const futureDistanceFromRouteMeters=distanceToRouteMeters(
    futureCoordinate,
    route.geometry
  );

  let risk:TrajectoryRisk="stable";
  if(
    futureDistanceFromRouteMeters>thresholdMeters ||
    currentDistanceFromRouteMeters>thresholdMeters
  ){
    risk="warning";
  }else if(
    futureDistanceFromRouteMeters>thresholdMeters*0.62 &&
    futureDistanceFromRouteMeters>
      currentDistanceFromRouteMeters+8
  ){
    risk="watch";
  }

  return {
    futureCoordinate,
    horizonSeconds,
    projectedMeters,
    currentDistanceFromRouteMeters,
    futureDistanceFromRouteMeters,
    thresholdMeters,
    risk
  };
}

export function adaptiveCameraProfile(
  mode:InMapRouteMode,
  speedKph:number|null,
  nextManeuverMeters:number|null,
  risk:TrajectoryRisk="stable"
){
  const speed=
    typeof speedKph==="number" && Number.isFinite(speedKph)
      ? Math.max(0,speedKph)
      : 0;
  const next=
    typeof nextManeuverMeters==="number" && Number.isFinite(nextManeuverMeters)
      ? Math.max(0,nextManeuverMeters)
      : Number.POSITIVE_INFINITY;

  if(risk==="warning"){
    return {zoom:17.25,pitch:34,offsetY:86,duration:280};
  }

  if(next<=70){
    return {
      zoom:mode==="walking" ? 18 : 17.45,
      pitch:mode==="walking" ? 16 : 34,
      offsetY:78,
      duration:300
    };
  }

  if(next<=180){
    return {
      zoom:mode==="walking" ? 17.7 : 17.05,
      pitch:mode==="walking" ? 18 : 40,
      offsetY:100,
      duration:330
    };
  }

  if(mode==="driving"){
    return {
      zoom:speed>=70 ? 15.95 : speed>=45 ? 16.25 : 16.65,
      pitch:speed>=45 ? 50 : 46,
      offsetY:138,
      duration:350
    };
  }

  if(mode==="walking"){
    return {zoom:17.35,pitch:18,offsetY:112,duration:350};
  }

  return {zoom:16.75,pitch:31,offsetY:125,duration:350};
}
