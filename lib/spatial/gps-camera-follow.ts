/** Rate-limit camera updates without dropping recent GPS positions.
 * For active follow, a new position may supersede our own in-flight ease,
 * but only after the previous camera animation has had time to progress.
 * A manual map gesture disables follow separately in the map controller.
 */
export const CAMERA_REBASE_INTERVAL_MS=1250;
export function cameraFollowDecision(input:{
  follow:boolean;visible:boolean;now:number;lastCameraAt:number;
  cameraMoving:boolean;reducedMotion:boolean;
}):"skip"|"ease"|"replace"|"jump"{
  if(!input.follow||!input.visible||!Number.isFinite(input.now))return "skip";
  if(input.lastCameraAt>0&&input.now-input.lastCameraAt<CAMERA_REBASE_INTERVAL_MS)
    return "skip";
  if(input.reducedMotion)return "jump";
  return input.cameraMoving?"replace":"ease";
}


/** Interrupting an in-progress eased camera with stop()+easeTo() can
 * leave a stale MapLibre render callback. Rebase the GPS camera atomically:
 * jumpTo for a moving camera, easeTo only after an animation has settled.
 * This does not modify the raw GPS fix, route, or direction.
 */
export function gpsCameraUpdateMethod(decision:ReturnType<typeof cameraFollowDecision>):
  "skip"|"ease"|"jump"{
  return decision==="replace"?"jump":decision;
}
