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

/**
 * The web GeolocationPosition timestamp specification uses epoch milliseconds.
 * Some WebKit embedders have historically exposed the provider's epoch seconds
 * instead. Normalize only plausible absolute epoch values and STILL enforce
 * freshness; never substitute the callback's arrival time for an old fix.
 */
export function normalizeGeolocationTimestamp(timestamp:number):number|null{
  if(!Number.isFinite(timestamp)||timestamp<=0)return null;
  if(timestamp>=1_000_000_000&&timestamp<100_000_000_000)
    return timestamp*1000;
  if(timestamp>=1_000_000_000_000&&timestamp<100_000_000_000_000)
    return timestamp;
  return null;
}

/** Do not move the map or reroute from cached or out-of-order positions. */
export function acceptGpsPositionTimestamp(
  timestamp:number,
  latestAcceptedTimestamp:number|null,
  now:number
):boolean{
  const normalized=normalizeGeolocationTimestamp(timestamp);
  if(normalized===null||!Number.isFinite(now))return false;
  const age=now-normalized;
  if(age>GPS_INCOMING_MAX_AGE_MS||age< -5000)return false;
  return latestAcceptedTimestamp===null||normalized>latestAcceptedTimestamp;
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
