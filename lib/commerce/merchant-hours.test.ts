import {it,expect} from "vitest";
import {emptyMerchantHours,validMerchantHours,merchantVerificationLabel} from "./merchant-hours";
it("does not invent opening hours and accepts explicitly closed days",()=>{
 const hours=emptyMerchantHours();expect(hours).toHaveLength(7);expect(hours.every(h=>h.closed&&h.opens===null)).toBe(true);expect(validMerchantHours(hours)).toBe(true);
 hours[0]={day:"mon",closed:false,opens:"09:00",closes:"18:00"};expect(validMerchantHours(hours)).toBe(true);
});
it("rejects missing and duplicate days, corrupt storage and invalid time intervals",()=>{
 for(const input of [null,{},[],emptyMerchantHours().slice(1),Array(7).fill(emptyMerchantHours()[0]),[null,...emptyMerchantHours().slice(1)]])expect(validMerchantHours(input)).toBe(false);
 for(const [opens,closes] of [["25:00","26:00"],["09:60","18:00"],["18:00","09:00"],["09:00","09:00"],[null,"18:00"]]){
  const hours=emptyMerchantHours();hours[0]={day:"mon",closed:false,opens,closes};expect(validMerchantHours(hours)).toBe(false);
 }
});
it("never presents local readiness as official verification",()=>{
 expect(merchantVerificationLabel(false,false,true)).toBe("Datos listos para solicitar revisión");
 expect(merchantVerificationLabel(false,true,true)).toBe("En revisión");
 expect(merchantVerificationLabel(true,false,false)).toBe("Publicado y verificado");
 expect(merchantVerificationLabel(false,false,false)).toBe("Perfil incompleto");
});
