/** NAVIBORI 2.9: conservative automatic reroute control.
 * Only used with accepted fresh geolocation fixes; no fake movement or
 * precision values are manufactured. Routing data is unchanged.
 */
export const NAV_GPS_MAX_REROUTE_ACCURACY_METERS=65;
export const NAV_REROUTE_MIN_FIX_SPACING_MS=1400;
export const NAV_REROUTE_MIN_REFRESH_INTERVAL_MS=8000;
export const NAV_REROUTE_REQUIRED_FIXES=2;

export function gpsFixAgeSeconds(lastFixAt:number|null,now:number):number|null{
  if(lastFixAt===null||!Number.isFinite(lastFixAt)||!Number.isFinite(now)||
     now<lastFixAt)return null;
  return Math.floor((now-lastFixAt)/1000);
}

export function reliableGpsForRouting(accuracyMeters:number|null):boolean{
  return accuracyMeters!==null&&Number.isFinite(accuracyMeters)&&
    accuracyMeters>=0&&accuracyMeters<=NAV_GPS_MAX_REROUTE_ACCURACY_METERS;
}

export type RerouteGuardInput={
  offRoute:boolean;
  accuracyMeters:number|null;
  lastConfirmedOffRouteAt:number|null;
  consecutiveCount:number;
  lastRouteRefreshAt:number;
  now:number;
  routeRequestPending:boolean;
};
export type RerouteGuardResult={
  shouldReroute:boolean;
  consecutiveCount:number;
  lastConfirmedOffRouteAt:number|null;
  reason:"low-confidence"|"on-route"|"collecting"|"cooldown"|"busy"|"reroute";
};

/** Require two spatially off-route fixes at different times.
 * Bad-accuracy fixes reset the streak, and in-flight requests never overlap.
 */
export function evaluateAutomaticReroute(input:RerouteGuardInput):RerouteGuardResult{
  const clear=(reason:RerouteGuardResult["reason"]):RerouteGuardResult=>({
    shouldReroute:false,consecutiveCount:0,lastConfirmedOffRouteAt:null,reason
  });
  if(!reliableGpsForRouting(input.accuracyMeters))return clear("low-confidence");
  if(!input.offRoute)return clear("on-route");
  if(!Number.isFinite(input.now)||!Number.isFinite(input.lastRouteRefreshAt))return clear("low-confidence");
  if(input.routeRequestPending)return clear("busy");
  let consecutiveCount=input.consecutiveCount;
  let lastConfirmedOffRouteAt=input.lastConfirmedOffRouteAt;
  if(lastConfirmedOffRouteAt===null||
     input.now-lastConfirmedOffRouteAt>=NAV_REROUTE_MIN_FIX_SPACING_MS){
    consecutiveCount=Math.min(NAV_REROUTE_REQUIRED_FIXES,consecutiveCount+1);
    lastConfirmedOffRouteAt=input.now;
  }
  if(consecutiveCount<NAV_REROUTE_REQUIRED_FIXES){
    return {shouldReroute:false,consecutiveCount,lastConfirmedOffRouteAt,
      reason:"collecting"};
  }
  if(input.now-input.lastRouteRefreshAt<NAV_REROUTE_MIN_REFRESH_INTERVAL_MS){
    return {shouldReroute:false,consecutiveCount,lastConfirmedOffRouteAt,
      reason:"cooldown"};
  }
  return {shouldReroute:true,consecutiveCount:0,lastConfirmedOffRouteAt:null,
    reason:"reroute"};
}
