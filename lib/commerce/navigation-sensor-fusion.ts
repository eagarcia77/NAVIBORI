export interface NavigationBearingInput{
  gpsHeading:number|null;
  speedKph:number|null;
  deviceHeading:number|null;
  routeHeading:number|null;
}

export function normalizeHeading(value:number){
  const normalized=value%360;
  return normalized<0 ? normalized+360 : normalized;
}

function shortestHeadingDelta(from:number,to:number){
  return ((to-from+540)%360)-180;
}

export function blendHeadings(
  primary:number,
  secondary:number,
  primaryWeight=0.7
){
  const weight=Math.max(0,Math.min(1,primaryWeight));
  const from=normalizeHeading(primary);
  const to=normalizeHeading(secondary);
  return normalizeHeading(from+shortestHeadingDelta(from,to)*(1-weight));
}

export function chooseNavigationBearing({
  gpsHeading,
  speedKph,
  deviceHeading,
  routeHeading
}:NavigationBearingInput){
  const valid=(value:number|null)=>
    typeof value==="number" && Number.isFinite(value);

  const moving=
    typeof speedKph==="number" &&
    Number.isFinite(speedKph) &&
    speedKph>=4;

  if(valid(gpsHeading) && moving){
    return valid(routeHeading)
      ? blendHeadings(gpsHeading!,routeHeading!,0.82)
      : normalizeHeading(gpsHeading!);
  }

  if(valid(deviceHeading)){
    return valid(routeHeading)
      ? blendHeadings(deviceHeading!,routeHeading!,0.62)
      : normalizeHeading(deviceHeading!);
  }

  if(valid(routeHeading)){
    return normalizeHeading(routeHeading!);
  }

  if(valid(gpsHeading)){
    return normalizeHeading(gpsHeading!);
  }

  return null;
}
