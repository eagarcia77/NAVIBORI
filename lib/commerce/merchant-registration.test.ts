import {describe,it,expect} from "vitest";
import {registrationInput} from "./merchant-registration";
function form(){const f=new FormData();for(const [k,v] of Object.entries({venue:"12345678-1234-1234-1234-123456789012",name:"Comercio",category:"servicios",description:"Una descripción completa",phone:"7875551234",whatsapp:"+1 (787) 555-1234",accept:"yes"}))f.set(k,v);return f;}
describe("merchant registration",()=>{
 it("normalizes contact details and ignores submitted ownership fields",()=>{const f=form();f.set("role","platform_owner");f.set("created_by","attacker");const input=registrationInput(f);expect(input.p_whatsapp).toBe("+17875551234");expect(input).not.toHaveProperty("role");expect(input).not.toHaveProperty("created_by");});
 it("rejects missing consent, incomplete profiles and unsafe URLs",()=>{
  for(const [key,value] of [["accept",""],["name","x"],["venue","not-a-uuid"],["category","admin"],["website","javascript:alert(1)"],["description","short"],["whatsapp","+1"]]){const f=form();f.set(key,value);expect(()=>registrationInput(f)).toThrow();}
 });
});
