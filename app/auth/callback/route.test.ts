import {beforeEach,it,expect,vi} from "vitest";
const auth=vi.hoisted(()=>({exchangeCodeForSession:vi.fn(),verifyOtp:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth})}));
vi.mock("@/lib/auth/email-confirmation",()=>({NAVIBORI_AUTH_CALLBACK_URL:"https://navibori.onrender.com/auth/callback"}));
import {GET} from "./route";
beforeEach(()=>vi.resetAllMocks());
it("directs a verified PKCE recovery to password entry",async()=>{
 auth.exchangeCodeForSession.mockResolvedValue({data:{redirectType:"recovery"},error:null});
 const result=await GET(new Request("https://untrusted.test/auth/callback?code=test&next=https://evil.test"));
 expect(result.headers.get("location")).toBe("https://navibori.onrender.com/reset-password");
});
it("accepts recovery OTP only after verification and rejects expired links",async()=>{
 auth.verifyOtp.mockResolvedValue({error:null});
 expect((await GET(new Request("https://navibori.onrender.com/auth/callback?token_hash=test&type=recovery"))).headers.get("location")).toBe("https://navibori.onrender.com/reset-password");
 expect(auth.verifyOtp).toHaveBeenCalledWith({type:"recovery",token_hash:"test"});
 auth.verifyOtp.mockResolvedValue({error:{message:"private"}});
 const target=(await GET(new Request("https://navibori.onrender.com/auth/callback?token_hash=test&type=recovery"))).headers.get("location")!;
 expect(target).toContain("/login?error=");expect(target).not.toContain("private");
});
it("does not use a forged recovery query as proof or accept arbitrary OTP types",async()=>{
 auth.exchangeCodeForSession.mockResolvedValue({data:{},error:null});
 const target=(await GET(new Request("https://navibori.onrender.com/auth/callback?code=test&flow=recovery"))).headers.get("location");
 expect(target).toContain("/login?message=");
 await GET(new Request("https://navibori.onrender.com/auth/callback?token_hash=test&type=invite"));
 expect(auth.verifyOtp).not.toHaveBeenCalled();
});
