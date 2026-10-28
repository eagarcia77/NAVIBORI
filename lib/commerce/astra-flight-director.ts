export type FlightDirectorPhase="acquire"|"locked"|"align"|"correct";
export type FlightDirectorCorrection="left"|"right"|"center";

export interface FlightDirectorInput{
  routeBearing:number|null;
  navigationBearing:number|null;
  routeDeviationMeters:number|null;
  gpsAccuracyMeters:number|null;
  speedKph:number|null;
}

export interface FlightDirectorState{
  phase:FlightDirectorPhase;
  correction:FlightDirectorCorrection;
  bearingErrorDegrees:number|null;
  cueOffset:number;
  corridorMeters:number;
  deviationMeters:number|null;
  confidence:number;
}

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

export function normalizeBearingDelta(
  targetBearing:number,
  currentBearing:number
){
  let delta=(targetBearing-currentBearing)%360;
  if(delta>180) delta-=360;
  if(delta<-180) delta+=360;
  return delta;
}

export function deriveFlightDirectorState(
  input:FlightDirectorInput
):FlightDirectorState{
  const accuracy=
    typeof input.gpsAccuracyMeters==="number" &&
    Number.isFinite(input.gpsAccuracyMeters)
      ? Math.max(0,input.gpsAccuracyMeters)
      : 20;

  const speed=
    typeof input.speedKph==="number" &&
    Number.isFinite(input.speedKph)
      ? Math.max(0,input.speedKph)
      : 0;

  const corridorMeters=clamp(
    8+accuracy*0.55+Math.min(speed,80)*0.08,
    10,
    42
  );

  const deviation=
    typeof input.routeDeviationMeters==="number" &&
    Number.isFinite(input.routeDeviationMeters)
      ? Math.max(0,input.routeDeviationMeters)
      : null;

  if(
    input.routeBearing===null ||
    input.navigationBearing===null ||
    !Number.isFinite(input.routeBearing) ||
    !Number.isFinite(input.navigationBearing)
  ){
    return {
      phase:"acquire",
      correction:"center",
      bearingErrorDegrees:null,
      cueOffset:0,
      corridorMeters,
      deviationMeters:deviation,
      confidence:0
    };
  }

  const delta=normalizeBearingDelta(
    input.routeBearing,
    input.navigationBearing
  );
  const absDelta=Math.abs(delta);
  const deviationPenalty=
    deviation===null
      ? 0.35
      : clamp(deviation/(corridorMeters*2.5),0,1);
  const accuracyPenalty=clamp(accuracy/80,0,1);
  const headingPenalty=clamp(absDelta/90,0,1);

  const confidence=Math.round(
    clamp(
      100-(
        headingPenalty*45+
        deviationPenalty*35+
        accuracyPenalty*20
      ),
      0,
      100
    )
  );

  const correction:FlightDirectorCorrection=
    absDelta<=7
      ? "center"
      : delta>0
        ? "right"
        : "left";

  let phase:FlightDirectorPhase="correct";

  if(
    absDelta<=8 &&
    (deviation===null || deviation<=corridorMeters)
  ){
    phase="locked";
  }else if(
    absDelta<=30 &&
    (deviation===null || deviation<=corridorMeters*1.75)
  ){
    phase="align";
  }

  return {
    phase,
    correction,
    bearingErrorDegrees:delta,
    cueOffset:clamp(delta/60,-1,1),
    corridorMeters,
    deviationMeters:deviation,
    confidence
  };
}

export function flightDirectorLabel(
  state:FlightDirectorState,
  language:"es"|"en"
){
  if(state.phase==="acquire"){
    return language==="en" ? "ACQUIRING" : "ADQUIRIENDO";
  }

  if(state.phase==="locked"){
    return language==="en" ? "ALIGNED" : "ALINEADO";
  }

  if(state.correction==="left"){
    return language==="en" ? "CORRECT LEFT" : "CORRIGE IZQUIERDA";
  }

  if(state.correction==="right"){
    return language==="en" ? "CORRECT RIGHT" : "CORRIGE DERECHA";
  }

  return language==="en" ? "ALIGN ROUTE" : "ALINEA RUTA";
}

export function flightDirectorHapticPattern(
  previous:FlightDirectorPhase|null,
  next:FlightDirectorPhase
){
  if(previous===next) return null;
  if(next==="correct") return [28,38,28];
  if(next==="locked") return 18;
  return null;
}
