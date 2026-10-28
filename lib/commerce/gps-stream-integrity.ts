import {distanceBetweenCoordinates,type RoutingCoordinate}
  from "./in-map-routing";

/** Protection against a single sudden GNSS multipath jump.
 * Only accepted device readings may update navigation or trigger rerouting.
 * Accuracy estimates come from GeolocationPosition, never fabricated.
 */
export interface StreamGpsFix{
  coordinate:RoutingCoordinate;
  timestamp:number;
  accuracyMeters:number|null;
}
export type GpsStreamDecision={
  accepted:boolean;
  reason:"first"|"plausible"|"long-gap"|"confirmed-move"|"unverified-jump"|"invalid";
  pendingJump:StreamGpsFix|null;
};
const MAX_TRACKED_SPEED_MPS=55;
const MIN_JUMP_THRESHOLD_METERS=110;
const LONG_GAP_MS=20_000;
const CONFIRM_NEAR_METERS=70;
const MAX_JUMP_CONFIRM_AGE_MS=12_000;

export function evaluateGpsStreamFix(
 previous:StreamGpsFix|null,
 next:StreamGpsFix,
 pendingJump:StreamGpsFix|null
):GpsStreamDecision{
  const invalid: GpsStreamDecision={accepted:false,reason:"invalid",pendingJump:null};
  if(!Number.isFinite(next.timestamp)||next.timestamp<=0||
      !Number.isFinite(next.coordinate.latitude)||
      !Number.isFinite(next.coordinate.longitude))return invalid;
  if(!previous)return {accepted:true,reason:"first",pendingJump:null};
  const elapsed=next.timestamp-previous.timestamp;
  if(elapsed<=0)return invalid;
  if(elapsed>LONG_GAP_MS)return {accepted:true,reason:"long-gap",pendingJump:null};
  const distance=distanceBetweenCoordinates(previous.coordinate,next.coordinate);
  const previousAccuracy=previous.accuracyMeters??0;
  const nextAccuracy=next.accuracyMeters??0;
  const uncertainty=Math.max(0,Math.min(500,previousAccuracy+nextAccuracy));
  const maxPlausible=Math.max(MIN_JUMP_THRESHOLD_METERS,
    elapsed/1000*MAX_TRACKED_SPEED_MPS+uncertainty);
  if(distance<=maxPlausible){
    return {accepted:true,reason:"plausible",pendingJump:null};
  }
  if(pendingJump &&
     next.timestamp-pendingJump.timestamp>0 &&
     next.timestamp-pendingJump.timestamp<=MAX_JUMP_CONFIRM_AGE_MS &&
     distanceBetweenCoordinates(pendingJump.coordinate,next.coordinate)<=CONFIRM_NEAR_METERS){
    return {accepted:true,reason:"confirmed-move",pendingJump:null};
  }
  return {accepted:false,reason:"unverified-jump",pendingJump:next};
}
