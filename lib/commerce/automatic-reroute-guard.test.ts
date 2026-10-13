import {describe,expect,it} from "vitest";
import {
  NAV_REROUTE_MIN_REFRESH_INTERVAL_MS,
  NAV_REROUTE_MIN_FIX_SPACING_MS,
  evaluateAutomaticReroute,
  gpsFixAgeSeconds,
  reliableGpsForRouting
} from "./automatic-reroute-guard";

const now=100_000;
const defaults={
  offRoute:true,accuracyMeters:8,lastConfirmedOffRouteAt:null,
  consecutiveCount:0,lastRouteRefreshAt:0,now,
  routeRequestPending:false
};
describe("NAVIBORI 2.9 trusted automatic rerouting",()=>{
  it("requires two sufficiently spaced, accurate off-route GPS readings",()=>{
    const first=evaluateAutomaticReroute(defaults);
    expect(first.reason).toBe("collecting");
    expect(first.consecutiveCount).toBe(1);
    const tooQuick=evaluateAutomaticReroute({...defaults,...first,now:now+400});
    expect(tooQuick.shouldReroute).toBe(false);
    expect(tooQuick.consecutiveCount).toBe(1);
    const second=evaluateAutomaticReroute({
      ...defaults,consecutiveCount:tooQuick.consecutiveCount,
      lastConfirmedOffRouteAt:tooQuick.lastConfirmedOffRouteAt,
      now:now+NAV_REROUTE_MIN_FIX_SPACING_MS+10
    });
    expect(second.shouldReroute).toBe(true);
    expect(second.consecutiveCount).toBe(0);
    expect(second.lastConfirmedOffRouteAt).toBeNull();
  });
  it("does not reroute using approximate or unknown GPS coordinates",()=>{
    for(const accuracy of [null,66,150,-1,Number.NaN]){
      const result=evaluateAutomaticReroute({...defaults,accuracyMeters:accuracy,
        consecutiveCount:1,lastConfirmedOffRouteAt:now-2000});
      expect(result.shouldReroute).toBe(false);
      expect(result.consecutiveCount).toBe(0);
      expect(result.reason).toBe("low-confidence");
    }
    expect(reliableGpsForRouting(65)).toBe(true);
    expect(reliableGpsForRouting(65.1)).toBe(false);
    expect(reliableGpsForRouting(0)).toBe(true);
  });
  it("does not issue overlapping or rapid-fire route requests",()=>{
    expect(evaluateAutomaticReroute({
      ...defaults,routeRequestPending:true,consecutiveCount:1,
      lastConfirmedOffRouteAt:now-2000
    }).reason).toBe("busy");
    const cooldown=evaluateAutomaticReroute({
      ...defaults,consecutiveCount:1,
      lastConfirmedOffRouteAt:now-2000,
      lastRouteRefreshAt:now-NAV_REROUTE_MIN_REFRESH_INTERVAL_MS+10
    });
    expect(cooldown.reason).toBe("cooldown");
    expect(cooldown.shouldReroute).toBe(false);
    const backOnRoute=evaluateAutomaticReroute({...defaults,offRoute:false,
      consecutiveCount:1,lastConfirmedOffRouteAt:now-1500});
    expect(backOnRoute.consecutiveCount).toBe(0);
  });
  it("reports real age of last accepted position without inventing a fix",()=>{
    expect(gpsFixAgeSeconds(null,now)).toBeNull();
    expect(gpsFixAgeSeconds(now+100,now)).toBeNull();
    expect(gpsFixAgeSeconds(now-5500,now)).toBe(5);
    expect(gpsFixAgeSeconds(now-18000,now)).toBe(18);
    expect(gpsFixAgeSeconds(Number.NaN,now)).toBeNull();
  });
});
