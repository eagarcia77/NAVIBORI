export type VectorGatePhase="cruise"|"near"|"critical"|"commit";

export function deriveVectorGatePhase(distanceMeters:number|null|undefined):VectorGatePhase{
  if(
    typeof distanceMeters!=="number" ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters<0
  ){
    return "cruise";
  }

  if(distanceMeters<=25) return "commit";
  if(distanceMeters<=75) return "critical";
  if(distanceMeters<=250) return "near";
  return "cruise";
}

export function vectorGateHapticPattern(phase:VectorGatePhase):number|number[]|null{
  switch(phase){
    case "near": return 20;
    case "critical": return [28,45,28];
    case "commit": return [42,30,42];
    default: return null;
  }
}

export function vectorGateGlyph(modifier:string|null|undefined){
  switch(modifier){
    case "left": return "↰";
    case "right": return "↱";
    case "slight left": return "↖";
    case "slight right": return "↗";
    case "sharp left": return "⬅";
    case "sharp right": return "➡";
    case "uturn": return "⤴";
    case "straight": return "↑";
    default: return "◇";
  }
}

export function vectorGateLabel(
  phase:VectorGatePhase,
  language:"es"|"en"
){
  if(language==="en"){
    switch(phase){
      case "near": return "APPROACH";
      case "critical": return "VECTOR";
      case "commit": return "COMMIT";
      default: return "CRUISE";
    }
  }

  switch(phase){
    case "near": return "APROXIMACIÓN";
    case "critical": return "VECTOR";
    case "commit": return "EJECUTAR";
    default: return "CRUCERO";
  }
}
