/** Rate-limit camera updates without dropping recent GPS positions.
 * For active follow, a new position may supersede our own in-flight ease,
 * but only after the previous camera animation has had time to progress.
 * A manual map gesture disables follow separately in the map controller.
 */
export const CAMERA_REBASE_INTERVAL_MS=1250;
export function cameraFollowDecision(input:{
  follow:boolean;visible:boolean;now:number;lastCameraAt:number;
  cameraMoving:boolean;reducedMotion:boolean;
}):"skip"|"jump"{
  if(!input.follow||!input.visible||!Number.isFinite(input.now))return "skip";
  if(input.lastCameraAt>0&&input.now-input.lastCameraAt<CAMERA_REBASE_INTERVAL_MS)
    return "skip";
  // Never interrupt a MapLibre easing frame with another camera update.
  // GPS fixes and guidance remain live while camera follow waits to settle.
  if(input.cameraMoving)return "skip";
  return "jump";
}

/** MapLibre's animated camera can leave a stale render callback when
 * the GPS re-centers during another animation. Use atomic jumpTo once idle.
 */
export function gpsCameraUpdateMethod(decision:ReturnType<typeof cameraFollowDecision>):
  "skip"|"jump"{
  return decision;
}
