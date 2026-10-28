/**
 * NovaScene 2.5 cockpit camera stabilization.
 * Changes camera motion only: GPS fix, routing coordinates and guidance
 * instructions remain unchanged and authoritative.
 */
export function normalizedBearing(value:number):number{
  return ((value % 360)+360)%360;
}

/** Shortest signed rotation -180..180, crossing 359°->1° correctly. */
export function shortestBearingDelta(from:number,to:number):number{
  return ((normalizedBearing(to)-normalizedBearing(from)+540)%360)-180;
}

/** Damp small GPS heading oscillations without freezing genuine turns.
 * For an invalid new direction, hold previous stable bearing if any.
 */
export function stabilizedCameraBearing(
  previous:number|null,
  proposed:number|null,
  speedKph:number|null,
  accuracyMeters:number|null
):number|null{
  if(proposed===null||!Number.isFinite(proposed)){
    return previous!==null&&Number.isFinite(previous)
      ?normalizedBearing(previous):null;
  }
  const target=normalizedBearing(proposed);
  if(previous===null||!Number.isFinite(previous))return target;
  const speed=speedKph!==null&&Number.isFinite(speedKph)
    ?Math.max(0,speedKph):0;
  const accuracy=accuracyMeters!==null&&Number.isFinite(accuracyMeters)
    ?Math.max(0,accuracyMeters):null;
  // Safari/iOS can report wildly oscillating compass headings while the
  // device is stationary. Preserve the last camera direction rather than
  // turning the map without actual movement. Never alter the GPS fix/route.
  if(speedKph!==null&&Number.isFinite(speedKph)&&speed<2)
    return normalizedBearing(previous);
  // Very poor horizontal accuracy makes route-relative camera rotation
  // misleading at pedestrian speeds; wait for a better location fix.
  if(accuracy!==null&&accuracy>100&&speed<8)
    return normalizedBearing(previous);
  const delta=shortestBearingDelta(previous,target);
  if(Math.abs(delta)<=1.4)return normalizedBearing(previous);
  // Travel-speed-aware damping: real turns converge within 1-3 GPS fixes.
  let factor=speed>=30?0.72:speed>=8?0.55:0.42;
  if(accuracy!==null&&accuracy>65)factor=Math.min(factor,0.32);
  const maxStep=speed>=30?85:speed>=8?65:48;
  const step=Math.max(-maxStep,Math.min(maxStep,delta*factor));
  return normalizedBearing(previous+step);
}

export type GpsSignalQuality="searching"|"precise"|"moderate"|"weak";
export function gpsSignalQuality(accuracyMeters:number|null):GpsSignalQuality{
  if(accuracyMeters===null||!Number.isFinite(accuracyMeters)||accuracyMeters<0)
    return "searching";
  if(accuracyMeters<=15)return "precise";
  if(accuracyMeters<=45)return "moderate";
  return "weak";
}

/** Only draw the SVG backup when the actual MapLibre route has NOT been
 * observed by queryRenderedFeatures in the current viewport.
 */
export function shouldDrawSvgFallback(nativeRouteVisible:boolean):boolean{
  return !nativeRouteVisible;
}
