import {describe,expect,it} from "vitest";
import {evaluateGpsStreamFix,type StreamGpsFix} from "./gps-stream-integrity";
const fix=(latitude:number,longitude:number,timestamp:number,
 accuracyMeters:number|null=8):StreamGpsFix=>({
 coordinate:{latitude,longitude},timestamp,accuracyMeters
});
describe("NAVIBORI 3.0 continuous GNSS stream integrity",()=>{
 const original=fix(18.052,-66.506,1_760_000_000_000);
 it("accepts successive plausible car movements without changing positions",()=>{
   expect(evaluateGpsStreamFix(null,original,null).reason).toBe("first");
   const nearby=fix(18.05212,-66.50578,original.timestamp+1600);
   const r=evaluateGpsStreamFix(original,nearby,null);
   expect(r.accepted).toBe(true);
   expect(r.pendingJump).toBeNull();
   expect(nearby.coordinate.longitude).toBe(-66.50578);
 });
 it("blocks a single sudden GNSS jump rather than rerouting to the wrong street",()=>{
   const jump=fix(18.062,-66.506,original.timestamp+1500);
   const r=evaluateGpsStreamFix(original,jump,null);
   expect(r.accepted).toBe(false);
   expect(r.reason).toBe("unverified-jump");
   expect(r.pendingJump).toEqual(jump);
   const good=fix(18.05214,-66.50587,original.timestamp+2700);
   expect(evaluateGpsStreamFix(original,good,jump).accepted).toBe(true);
 });
 it("accepts two closely agreeing fixes confirming actual new position",()=>{
   const jump=fix(18.062,-66.506,original.timestamp+1500);
   const proposed=evaluateGpsStreamFix(original,jump,null);
   const confirmed=fix(18.06211,-66.50596,original.timestamp+3200);
   const r=evaluateGpsStreamFix(original,confirmed,proposed.pendingJump);
   expect(r.reason).toBe("confirmed-move");
   expect(r.accepted).toBe(true);
 });
 it("resumes after a long background suspension without blocking user movement",()=>{
   const next=fix(18.07,-66.512,original.timestamp+26_000);
   const r=evaluateGpsStreamFix(original,next,null);
   expect(r.accepted).toBe(true);
   expect(r.reason).toBe("long-gap");
 });
 it("rejects non-monotonic position samples and old jump confirmations",()=>{
   expect(evaluateGpsStreamFix(original,original,null).accepted).toBe(false);
   const jump=fix(18.062,-66.506,original.timestamp+1500);
   const next=fix(18.06212,-66.5059,original.timestamp+18000);
   const decision=evaluateGpsStreamFix(original,next,jump);
   expect(decision.reason).toBe("unverified-jump");
 });
});
