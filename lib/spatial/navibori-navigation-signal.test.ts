import {describe,expect,it} from "vitest";
import {
  navigationSignalCopy,navigationSignalState
} from "./navibori-navigation-signal";

describe("NAVIBORI 2.7: route provenance is independent of GPS status",()=>{
  const now=1_761_000_000_000;
  it("does not describe a synthetic business destination as simulated GPS",()=>{
    const signal=navigationSignalState(true,null,now);
    expect(signal).toEqual({
      routeKind:"demo",fix:"waiting",current:false,retryRecommended:true
    });
    expect(navigationSignalCopy(signal,"es",null,false)).toEqual({
      route:"RUTA DEMO",gps:"GPS por confirmar"
    });
    expect(navigationSignalCopy(signal,"en",null,false)).toEqual({
      route:"DEMO ROUTE",gps:"GPS not yet confirmed"
    });
  });
  it("keeps the DEMO route label even after real GPS coordinates arrive",()=>{
    const signal=navigationSignalState(true,now-1000,now);
    expect(signal.current).toBe(true);
    expect(signal.retryRecommended).toBe(false);
    expect(navigationSignalCopy(signal,"es",7.8,false)).toEqual({
      route:"RUTA DEMO",gps:"GPS ±8 m"
    });
  });
  it("distinguishes missing first fix from a stale once-working GPS signal",()=>{
    const stale=navigationSignalState(false,now-30_000,now);
    expect(stale.fix).toBe("stale");
    expect(navigationSignalCopy(stale,"es",11,false)).toEqual({
      route:"RUTA REAL",gps:"GPS sin señal reciente"
    });
    expect(navigationSignalCopy(stale,"en",null,true).gps).toBe("Reconnecting GPS");
  });
  it("prevents false accuracy claims on invalid GNSS precision",()=>{
    const signal=navigationSignalState(false,now-1000,now);
    expect(navigationSignalCopy(signal,"es",Number.NaN,false).gps).toBe("GPS actualizado");
    expect(navigationSignalCopy(signal,"es",-1,false).gps).toBe("GPS actualizado");
  });
});
