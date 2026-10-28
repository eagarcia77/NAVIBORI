import type {InMapRouteMode} from "./in-map-routing";

export type ExoDockState="inactive"|"acquire"|"align"|"dock";

export interface ExoDockInput{
  gpsActive:boolean;
  arrived:boolean;
  remainingMeters:number|null;
}

function finite(value:number|null){
  return typeof value==="number" && Number.isFinite(value);
}

export function deriveExoDockState({
  gpsActive,
  arrived,
  remainingMeters
}:ExoDockInput):ExoDockState{
  if(arrived) return "dock";
  if(!gpsActive || !finite(remainingMeters)) return "inactive";

  const remaining=Math.max(0,remainingMeters!);
  if(remaining<=25) return "dock";
  if(remaining<=80) return "align";
  if(remaining<=180) return "acquire";
  return "inactive";
}

export function exoDockLabel(
  state:ExoDockState,
  language:"es"|"en"
){
  const labels={
    es:{
      inactive:"",
      acquire:"ADQUIRIR",
      align:"ALINEAR",
      dock:"ACOPLAR"
    },
    en:{
      inactive:"",
      acquire:"ACQUIRE",
      align:"ALIGN",
      dock:"DOCK"
    }
  } as const;

  return labels[language][state];
}

export function exoDockCameraProfile(
  state:ExoDockState,
  mode:InMapRouteMode
){
  if(state==="dock"){
    return {zoom:18.35,pitch:0,offsetY:32,duration:280};
  }

  if(state==="align"){
    return {
      zoom:mode==="walking" ? 18.05 : 17.75,
      pitch:mode==="walking" ? 10 : 22,
      offsetY:58,
      duration:300
    };
  }

  if(state==="acquire"){
    return {
      zoom:mode==="walking" ? 17.75 : 17.35,
      pitch:mode==="walking" ? 14 : 30,
      offsetY:78,
      duration:320
    };
  }

  return null;
}
