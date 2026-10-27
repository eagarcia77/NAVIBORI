import {it,expect} from "vitest";
import {mayNotifyNearby} from "./nearby-alert-policy";
it("enforces daily offer cooldown and ten-minute device cooldown",()=>{
 const now=Date.now();expect(mayNotifyNearby(now,0,0)).toBe(true);
 expect(mayNotifyNearby(now,now-1000,0)).toBe(false);
 expect(mayNotifyNearby(now,0,now-1000)).toBe(false);
 expect(mayNotifyNearby(now,NaN,0)).toBe(false);
 expect(mayNotifyNearby(now,now+1000,0)).toBe(false);
});
