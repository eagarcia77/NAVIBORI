import {describe,it,expect} from "vitest";
import {cameraFollowDecision,gpsCameraUpdateMethod,CAMERA_REBASE_INTERVAL_MS} from "./gps-camera-follow";
const base={follow:true,visible:true,now:15000,lastCameraAt:13000,cameraMoving:false,reducedMotion:false};
describe("NAVIBORI 3.0 follow GPS camera",()=>{
 it("can rebase an in-flight camera after a safe interval",()=>{
  expect(cameraFollowDecision({...base,cameraMoving:true})).toBe("replace");
  expect(cameraFollowDecision({...base,cameraMoving:false})).toBe("ease");
 });
 it("never interrupts camera on a dense stream of GPS callbacks",()=>{
  expect(cameraFollowDecision({...base,lastCameraAt:15000-CAMERA_REBASE_INTERVAL_MS+1,cameraMoving:true})).toBe("skip");
  expect(cameraFollowDecision({...base,lastCameraAt:15000-CAMERA_REBASE_INTERVAL_MS,cameraMoving:true})).toBe("replace");
 });
 it("avoids MapLibre interrupted easing frames while continuing GPS follow",()=>{
  expect(gpsCameraUpdateMethod("replace")).toBe("jump");
  expect(gpsCameraUpdateMethod("jump")).toBe("jump");
  expect(gpsCameraUpdateMethod("ease")).toBe("ease");
  expect(gpsCameraUpdateMethod("skip")).toBe("skip");
  expect(gpsCameraUpdateMethod(cameraFollowDecision({
    ...base,cameraMoving:true
  }))).toBe("jump");
 });
 it("respects manual view, suspended browser and reduced motion",()=>{
  expect(cameraFollowDecision({...base,follow:false})).toBe("skip");
  expect(cameraFollowDecision({...base,visible:false})).toBe("skip");
  expect(cameraFollowDecision({...base,reducedMotion:true})).toBe("jump");
  expect(cameraFollowDecision({...base,now:Number.NaN})).toBe("skip");
 });
});
