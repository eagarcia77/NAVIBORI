import {
  type InMapRouteMode,
  type InMapRouteResult,
  type RoutingCoordinate
} from "./in-map-routing";
import {coordinateAtRouteDistance} from "./orbital-lookahead";

export type DriftBridgePhase="inactive"|"holding"|"expired";

export interface DriftBridgeEstimate{
  phase:DriftBridgePhase;
  coordinate:RoutingCoordinate|null;
  elapsedMs:number;
  projectedMeters:number;
  routeDistanceMeters:number;
  confidence:number;
}

const MIN_STALE_MS=2200;
const MAX_HOLD_MS=8000;

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

function minimumSpeed(mode:InMapRouteMode){
  return {
    driving:5,
    cycling:3,
    scooter:3,
    walking:1.2
  }[mode];
}

export function driftBridgeWindow(){
  return {
    minStaleMs:MIN_STALE_MS,
    maxHoldMs:MAX_HOLD_MS
  };
}

export function buildDriftBridgeEstimate(
  route:InMapRouteResult,
  traveledMeters:number,
  speedKph:number|null,
  elapsedMs:number,
  gpsAccuracyMeters:number|null
):DriftBridgeEstimate{
  const elapsed=Math.max(0,elapsedMs);
  const speed=
    typeof speedKph==="number" && Number.isFinite(speedKph)
      ? Math.max(0,speedKph)
      : 0;

  if(elapsed<MIN_STALE_MS || speed<minimumSpeed(route.mode)){
    return {
      phase:"inactive",
      coordinate:null,
      elapsedMs:elapsed,
      projectedMeters:0,
      routeDistanceMeters:clamp(traveledMeters,0,route.distanceMeters),
      confidence:100
    };
  }

  if(elapsed>MAX_HOLD_MS){
    return {
      phase:"expired",
      coordinate:null,
      elapsedMs:elapsed,
      projectedMeters:0,
      routeDistanceMeters:clamp(traveledMeters,0,route.distanceMeters),
      confidence:0
    };
  }

  const seconds=elapsed/1000;
  const projectedMeters=clamp(
    speed/3.6*seconds,
    0,
    route.mode==="driving" ? 180 : route.mode==="walking" ? 24 : 80
  );
  const routeDistanceMeters=clamp(
    traveledMeters+projectedMeters,
    0,
    route.distanceMeters
  );
  const coordinate=coordinateAtRouteDistance(route,routeDistanceMeters);

  const accuracyPenalty=
    typeof gpsAccuracyMeters==="number" && Number.isFinite(gpsAccuracyMeters)
      ? clamp(gpsAccuracyMeters/1.6,0,28)
      : 12;
  const timePenalty=clamp(
    (elapsed-MIN_STALE_MS)/(MAX_HOLD_MS-MIN_STALE_MS)*62,
    0,
    62
  );
  const confidence=Math.round(
    clamp(100-accuracyPenalty-timePenalty,18,96)
  );

  return {
    phase:coordinate ? "holding" : "expired",
    coordinate,
    elapsedMs:elapsed,
    projectedMeters,
    routeDistanceMeters,
    confidence:coordinate ? confidence : 0
  };
}
