import type {InMapRouteMode,RoutingCoordinate} from "./in-map-routing";

export type GravityLensPhase="cruise"|"acquire"|"focus"|"commit";

export interface GravityLensInput{
  baseCoordinate:RoutingCoordinate;
  maneuverCoordinate:RoutingCoordinate|null;
  maneuverDistanceMeters:number|null;
  mode:InMapRouteMode;
  speedKph:number|null;
  reducedMotion?:boolean;
}

export interface GravityLensState{
  phase:GravityLensPhase;
  center:RoutingCoordinate;
  blend:number;
  zoomBoost:number;
  pitchBias:number;
  offsetYBias:number;
  durationScale:number;
}

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

function interpolateCoordinate(
  from:RoutingCoordinate,
  to:RoutingCoordinate,
  ratio:number
):RoutingCoordinate{
  const t=clamp(ratio,0,1);
  return {
    latitude:from.latitude+(to.latitude-from.latitude)*t,
    longitude:from.longitude+(to.longitude-from.longitude)*t
  };
}

function thresholds(mode:InMapRouteMode){
  switch(mode){
    case "walking":
      return {acquire:180,focus:70,commit:20};
    case "cycling":
      return {acquire:320,focus:120,commit:35};
    case "scooter":
      return {acquire:320,focus:120,commit:35};
    default:
      return {acquire:500,focus:190,commit:55};
  }
}

export function deriveGravityLensPhase(
  mode:InMapRouteMode,
  maneuverDistanceMeters:number|null
):GravityLensPhase{
  if(
    typeof maneuverDistanceMeters!=="number" ||
    !Number.isFinite(maneuverDistanceMeters) ||
    maneuverDistanceMeters<0
  ){
    return "cruise";
  }

  const limits=thresholds(mode);
  if(maneuverDistanceMeters<=limits.commit) return "commit";
  if(maneuverDistanceMeters<=limits.focus) return "focus";
  if(maneuverDistanceMeters<=limits.acquire) return "acquire";
  return "cruise";
}

export function buildGravityLens(input:GravityLensInput):GravityLensState{
  const phase=deriveGravityLensPhase(
    input.mode,
    input.maneuverDistanceMeters
  );

  if(!input.maneuverCoordinate || phase==="cruise"){
    return {
      phase:"cruise",
      center:input.baseCoordinate,
      blend:0,
      zoomBoost:0,
      pitchBias:0,
      offsetYBias:0,
      durationScale:1
    };
  }

  const speed=
    typeof input.speedKph==="number" && Number.isFinite(input.speedKph)
      ? Math.max(0,input.speedKph)
      : 0;

  const motionScale=input.reducedMotion ? 0.55 : 1;
  const speedScale=
    input.mode==="driving"
      ? clamp(1-(speed/140)*0.18,0.82,1)
      : 1;

  const config={
    acquire:{
      blend:0.18,
      zoomBoost:0.12,
      pitchBias:-2,
      offsetYBias:-10,
      durationScale:0.95
    },
    focus:{
      blend:0.34,
      zoomBoost:0.28,
      pitchBias:-7,
      offsetYBias:-24,
      durationScale:0.88
    },
    commit:{
      blend:0.48,
      zoomBoost:0.48,
      pitchBias:-13,
      offsetYBias:-38,
      durationScale:0.78
    }
  }[phase];

  const blend=config.blend*motionScale*speedScale;

  return {
    phase,
    center:interpolateCoordinate(
      input.baseCoordinate,
      input.maneuverCoordinate,
      blend
    ),
    blend,
    zoomBoost:config.zoomBoost*motionScale,
    pitchBias:config.pitchBias*motionScale,
    offsetYBias:config.offsetYBias*motionScale,
    durationScale:input.reducedMotion
      ? 0.7
      : config.durationScale
  };
}

export function applyGravityLensToCamera(
  base:{
    zoom:number;
    pitch:number;
    offsetY:number;
    duration:number;
  },
  lens:GravityLensState
){
  return {
    zoom:clamp(base.zoom+lens.zoomBoost,14,19),
    pitch:clamp(base.pitch+lens.pitchBias,0,60),
    offsetY:clamp(base.offsetY+lens.offsetYBias,48,180),
    duration:Math.max(180,Math.round(base.duration*lens.durationScale))
  };
}
