import {describe,expect,it} from "vitest";
import {
  acceptGpsPositionTimestamp,
  gpsFixStatus,
  hasLiveGpsFix,
  GPS_INCOMING_MAX_AGE_MS,
  GPS_SIGNAL_STALE_MS
} from "./navibori-gps-freshness";

describe("NAVIBORI 2.6 live GPS signal integrity",()=>{
  const now=1_760_000_000_000;
  it("accepts a fresh first position and newer fixes from Safari",()=>{
    expect(acceptGpsPositionTimestamp(now,null,now)).toBe(true);
    expect(acceptGpsPositionTimestamp(now+1000,now,now+1000)).toBe(true);
  });
  it("rejects cached, out-of-order, invalid or future GPS positions",()=>{
    expect(acceptGpsPositionTimestamp(now-GPS_INCOMING_MAX_AGE_MS-1,null,now)).toBe(false);
    expect(acceptGpsPositionTimestamp(now-1,now,now)).toBe(false);
    expect(acceptGpsPositionTimestamp(now,now,now)).toBe(false);
    expect(acceptGpsPositionTimestamp(0,null,now)).toBe(false);
    expect(acceptGpsPositionTimestamp(Number.NaN,null,now)).toBe(false);
    expect(acceptGpsPositionTimestamp(now+6000,null,now)).toBe(false);
  });
  it("marks frozen background updates as stale rather than current navigation",()=>{
    expect(gpsFixStatus(null,now)).toBe("waiting");
    expect(gpsFixStatus(now-GPS_SIGNAL_STALE_MS,now)).toBe("current");
    expect(gpsFixStatus(now-GPS_SIGNAL_STALE_MS-1,now)).toBe("stale");
    expect(gpsFixStatus(now+1000,now)).toBe("stale");
    expect(gpsFixStatus(now-1000,now)).toBe("current");
  });
  it("does not count a cached origin as a verified live navigation position",()=>{
    expect(hasLiveGpsFix(null,now)).toBe(false);
    expect(hasLiveGpsFix(now-1000,now)).toBe(false);
    expect(hasLiveGpsFix(now,now)).toBe(true);
    expect(hasLiveGpsFix(now+1000,now)).toBe(true);
  });
});
