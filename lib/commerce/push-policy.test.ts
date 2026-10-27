import {describe,it,expect} from "vitest";
import {allowedPushEndpoint,safePromotionPath,notificationPayload} from "../../supabase/functions/_shared/push-policy";
describe("push delivery policy",()=>{
 it("accepts supported browser push services only",()=>{
  for(const endpoint of ["https://fcm.googleapis.com/fcm/send/token","https://updates.push.services.mozilla.com/wpush/v2/token","https://web.push.apple.com/token"])
   expect(allowedPushEndpoint(endpoint)).toBe(true);
  for(const endpoint of ["https://127.0.0.1/token","https://evil.test/token","http://web.push.apple.com/token","https://web.push.apple.com.evil.test/token","https://user:pass@web.push.apple.com/token","https://web.push.apple.com:8443/token"])
   expect(allowedPushEndpoint(endpoint)).toBe(false);
 });
 it("bounds multilingual payloads without losing the exact advertisement identity",()=>{
  const payload=notificationPayload({name:"漢".repeat(120),slug:"negocio"},{id:"id-exacto",title:"漢".repeat(120),description:"漢".repeat(1000)});
  expect(new TextEncoder().encode(JSON.stringify(payload)).byteLength).toBeLessThanOrEqual(3000);
  expect(payload.id).toBe("id-exacto");expect(payload.url).toBe("/comercios/negocio");
 });
 it("keeps notification links inside the commerce directory",()=>{
  expect(safePromotionPath("//evil.test/path")).toBe("/comercios");
  expect(safePromotionPath("/comercios/../../login")).toBe("/comercios");
  expect(notificationPayload({name:"Tienda",slug:"tienda"},{id:"p",title:"Oferta"}).url).toBe("/comercios/tienda");
 });
});
