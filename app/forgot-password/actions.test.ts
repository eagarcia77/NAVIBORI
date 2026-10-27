import {beforeEach,it,expect,vi} from "vitest";
const auth=vi.hoisted(()=>({resetPasswordForEmail:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(url);}}));
vi.mock("@/lib/auth/email-confirmation",async()=>await import("../../lib/auth/email-confirmation"));
vi.mock("@/lib/auth/account-input",async()=>await import("../../lib/auth/account-input"));
import {requestPasswordReset} from "./actions";
function form(email="person@example.com"){const f=new FormData();f.set("email",email);return f;}
beforeEach(()=>vi.resetAllMocks());
it("rejects invalid email before contacting the email service",async()=>{
 await expect(requestPasswordReset(form("invalid"))).rejects.toThrow("/forgot-password?error=");
 expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
});
it("uses the fixed callback and identical success text for unknown accounts",async()=>{
 auth.resetPasswordForEmail.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{code:"user_not_found"}});
 const first=await requestPasswordReset(form()).catch(e=>e.message);
 const second=await requestPasswordReset(form()).catch(e=>e.message);
 expect(first).toBe(second);expect(first).toContain("/forgot-password?message=");
 expect(first).not.toContain("person");
 expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("person@example.com",{redirectTo:"https://navibori.onrender.com/auth/callback"});
});
it("does not claim email success when delivery fails",async()=>{
 auth.resetPasswordForEmail.mockResolvedValue({error:{code:"unexpected_failure",message:"secret SMTP diagnostic"}});
 const result=await requestPasswordReset(form()).catch(e=>e.message);
 expect(result).toContain("/forgot-password?error=");expect(result).not.toContain("secret");
});
