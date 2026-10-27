import {describe,it,expect} from "vitest";
import {promotionStatus,pushResultMessage} from "./promotion-status";
const now=Date.parse("2026-10-27T12:00:00Z");
describe("promotion time and delivery status",()=>{
 it("moves scheduled offers to current and current offers to expired at the exact boundary",()=>{
  const p={active:true,starts_at:"2026-10-27T12:00:00Z",ends_at:"2026-10-27T13:00:00Z"};
  expect(promotionStatus(p,true,now-1)).toBe("Programada");expect(promotionStatus(p,true,now)).toBe("Vigente");
  expect(promotionStatus(p,true,Date.parse(p.ends_at))).toBe("Vencida");
 });
 it("does not treat invalid dates as an active advertisement",()=>{
  expect(promotionStatus({active:true,starts_at:"invalid",ends_at:null},true,now)).toBe("Fechas inválidas");
  expect(promotionStatus({active:true,starts_at:null,ends_at:null},false,now)).toBe("En borrador");
 });
 it("does not report failed, partial or in-progress duplicate sends as delivered",()=>{
  expect(pushResultMessage({duplicate:true,status:"failed"})).toContain("falló");
  expect(pushResultMessage({duplicate:true,status:"sending"})).toContain("en proceso");
  expect(pushResultMessage({duplicate:true,status:"partial"})).toContain("parcial");
  expect(pushResultMessage({duplicate:true,status:"sent"})).toContain("La recepción depende");
  expect(pushResultMessage({sentCount:0,failedCount:2})).toContain("no aceptó");
 });
});
