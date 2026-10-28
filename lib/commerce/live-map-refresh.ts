export const COMMERCE_MAP_REFRESH_MS=60_000;

export function shouldRefreshCommerceMap({
  visibility,
  gpsActive,
  inFlight
}:{
  visibility:DocumentVisibilityState;
  gpsActive:boolean;
  inFlight:boolean;
}){
  return visibility==="visible" && !gpsActive && !inFlight;
}
