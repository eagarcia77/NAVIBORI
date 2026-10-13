/**
 * GPS freshness gates for mobile browser navigation.
 * A rendered 3D route is not proof of a current GNSS fix.
 */
export type GpsFixStatus="waiting"|"current"|"stale";

export const GPS_INCOMING_MAX_AGE_MS=20_000;
export const GPS_SIGNAL_STALE_MS=18_000;

export function gpsFixStatus(
  lastReceivedAt:number|null,
  now:number
):GpsFixStatus{
  if(lastReceivedAt===null || !Number.isFinite(lastReceivedAt))return "waiting";
  if(!Number.isFinite(now))return "stale";
  const age=now-lastReceivedAt;
  return age>=0&&age<=GPS_SIGNAL_STALE_MS?"current":"stale";
}

/** Do not move the map or recalculate from an out-of-order, cached or
 * invalid position delivered after a new accurate sample.
 */
export function acceptGpsPositionTimestamp(
  timestamp:number,
  latestAcceptedTimestamp:number|null,
  now:number
):boolean{
  if(!Number.isFinite(timestamp)||timestamp<=0||!Number.isFinite(now))return false;
  const age=now-timestamp;
  if(age>GPS_INCOMING_MAX_AGE_MS||age< -5000)return false;
  return latestAcceptedTimestamp===null||timestamp>latestAcceptedTimestamp;
}

/** When no live fix arrives, a previously cached starting point must never
 * count as a successful real-time GNSS acquisition.
 */
export function hasLiveGpsFix(
  lastReceivedAt:number|null,
  sessionStartedAt:number
):boolean{
  return lastReceivedAt!==null && Number.isFinite(lastReceivedAt) &&
    lastReceivedAt>=sessionStartedAt;
}
