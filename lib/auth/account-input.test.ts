import {it,expect} from "vitest";
import {accountCredentials,newPassword,accountError} from "./account-input";
function form(values:Record<string,string>){const data=new FormData();for(const [k,v] of Object.entries(values))data.set(k,v);return data;}
it("rejects invalid credentials without throwing and preserves password spaces",()=>{
 expect(accountCredentials(form({email:"invalid",password:"12345678"})).error).toBeTruthy();
 expect(accountCredentials(form({email:" A@EXAMPLE.COM ",password:"  secure  "}))).toEqual({email:"a@example.com",password:"  secure  "});
});
it("does not prevent existing short-password users from signing in but rejects weak signup",()=>{
 const input=form({email:"a@example.com",password:"short"});
 expect(accountCredentials(input).error).toBeUndefined();expect(accountCredentials(input,true).error).toBeTruthy();
});
it("requires matching new passwords without trimming either value",()=>{
 expect(newPassword(form({password:"12345678",confirmPassword:"12345678"}))).toEqual({password:"12345678"});
 expect(newPassword(form({password:"12345678",confirmPassword:"12345678 "})).error).toBeTruthy();
 expect(newPassword(form({password:"short",confirmPassword:"short"})).error).toBeTruthy();
});
it("returns safe Spanish errors without echoing unknown backend content",()=>{
 expect(accountError("email_not_confirmed")).toContain("Confirma tu correo");
 expect(accountError("over_email_send_rate_limit")).toContain("Espera");
 expect(accountError("secret@example.com token=secret")).not.toContain("secret");
});
