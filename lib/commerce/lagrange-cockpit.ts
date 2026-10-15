import type {TrajectoryRisk} from "./trajectory-shield";

export type LagrangeCockpitPhase=
  |"idle"
  |"cruise"
  |"approach"
  |"vector"
  |"correction"
  |"arrival";

export interface LagrangeCockpitInput{
  gpsActive:boolean;
  arrived:boolean;
  nextManeuverMeters:number|null;
  remainingMeters:number|null;
  trajectoryRisk:TrajectoryRisk;
}

function finite(value:number|null){
  return typeof value==="number" && Number.isFinite(value);
}

export function deriveLagrangeCockpitPhase({
  gpsActive,
  arrived,
  nextManeuverMeters,
  remainingMeters,
  trajectoryRisk
}:LagrangeCockpitInput):LagrangeCockpitPhase{
  if(
    arrived ||
    (finite(remainingMeters) && Math.max(0,remainingMeters!)<=25)
  ){
    return "arrival";
  }

  if(!gpsActive){
    return "idle";
  }

  if(trajectoryRisk==="warning"){
    return "correction";
  }

  if(
    finite(nextManeuverMeters) &&
    Math.max(0,nextManeuverMeters!)<=75
  ){
    return "vector";
  }

  if(
    trajectoryRisk==="watch" ||
    (
      finite(nextManeuverMeters) &&
      Math.max(0,nextManeuverMeters!)<=250
    )
  ){
    return "approach";
  }

  return "cruise";
}

export function lagrangePhaseLabel(
  phase:LagrangeCockpitPhase,
  language:"es"|"en"
){
  const labels={
    es:{
      idle:"EN ESPERA",
      cruise:"CRUCERO",
      approach:"APROXIMACIÓN",
      vector:"VECTOR",
      correction:"CORRECCIÓN",
      arrival:"LLEGADA"
    },
    en:{
      idle:"STANDBY",
      cruise:"CRUISE",
      approach:"APPROACH",
      vector:"VECTOR",
      correction:"CORRECTION",
      arrival:"ARRIVAL"
    }
  } as const;

  return labels[language][phase];
}
