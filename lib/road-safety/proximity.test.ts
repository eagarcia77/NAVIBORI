import {describe,expect,it} from "vitest";
import {
  REPORT_TTL_MS, metersBetween, nearbyAlerts, validReport,
  type RoadAlert
} from "./proximity";

const now=Date.UTC(2026,9,13,12,0,0);
const report=(overrides:Partial<RoadAlert>={}):RoadAlert=>({
  id:"r1",kind:"speed-check",latitude:18.06,longitude:-66.5,
  createdAt:now-60000,expiresAt:now+60000,source:"local",...overrides
});

describe("road safety proximity",()=>{
  it("calculates a reasonable distance from geographic coordinates",()=>{
    const meters=metersBetween({latitude:18,longitude:-66},{latitude:19,longitude:-66});
    expect(meters).toBeGreaterThan(110000);
    expect(meters).toBeLessThan(112000);
  });
  it("rejects expired and malformed reports",()=>{
    expect(validReport(report(),now)).toBe(true);
    expect(validReport(report({expiresAt:now-1}),now)).toBe(false);
    expect(validReport(report({latitude:181}),now)).toBe(false);
    expect(validReport(report({source:"local",expiresAt:now+REPORT_TTL_MS["speed-check"]+120000}),now)).toBe(false);
  });
  it("keeps only nearby, valid reports and orders by distance",()=>{
    const near=report({id:"near",latitude:18.052,longitude:-66.506});
    const far=report({id:"far",latitude:18.08,longitude:-66.506});
    const expired=report({id:"expired",latitude:18.052,expiresAt:now-1});
    const list=nearbyAlerts({latitude:18.051,longitude:-66.506},[far,expired,near],now,1000);
    expect(list.map(item=>item.alert.id)).toEqual(["near"]);
  });
  it("marks events behind a valid movement heading as not ahead",()=>{
    const list=nearbyAlerts(
      {latitude:18.052,longitude:-66.506,heading:90},
      [report({latitude:18.052,longitude:-66.516})],now,2000
    );
    expect(list).toHaveLength(1);
    expect(list[0].ahead).toBe(false);
  });
  it("does not hide nearby reports if heading is unknown",()=>{
    const list=nearbyAlerts(
      {latitude:18.052,longitude:-66.506,heading:null},
      [report({latitude:18.052,longitude:-66.507})],now,2000
    );
    expect(list).toHaveLength(1);
    expect(list[0].ahead).toBe(true);
  });
});
