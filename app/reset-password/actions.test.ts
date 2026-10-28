import {beforeEach,it,expect,vi} from "vitest";
const auth=vi.hoisted(()=>({getUser:vi.fn(),updateUser:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth})}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(url);}}));
vi.mock("@/lib/auth/account-input",async()=>await import("../../lib/auth/account-input"));
import {updatePassword} from "./actions";
function form(confirm="new-password"){const f=new FormData();f.set("password","new-password");f.set("confirmPassword",confirm);return f;}
beforeEach(()=>vi.resetAllMocks());
it("requires a server-validated non-anonymous account before changing a password",async()=>{
 for(const user of [null,{id:"a",is_anonymous:true}]){
  auth.getUser.mockResolvedValue({data:{user},error:null});
  await expect(updatePassword(form())).rejects.toThrow("/forgot-password?error=");
 }
 expect(auth.updateUser).not.toHaveBeenCalled();
});
it("rejects a stale session and mismatched passwords without updating Auth",async()=>{
 auth.getUser.mockResolvedValue({data:{user:{id:"a"}},error:{message:"expired"}});
 await expect(updatePassword(form())).rejects.toThrow("/forgot-password?error=");
 await expect(updatePassword(form("different"))).rejects.toThrow("/reset-password?error=");
 expect(auth.updateUser).not.toHaveBeenCalled();
});
it("updates only the current account and redirects only after Auth accepts it",async()=>{
 auth.getUser.mockResolvedValue({data:{user:{id:"a"}},error:null});auth.updateUser.mockResolvedValue({error:null});
 await expect(updatePassword(form())).rejects.toThrow("/merchant?passwordUpdated=1");
 expect(auth.updateUser).toHaveBeenCalledExactlyOnceWith({password:"new-password"});
 auth.updateUser.mockResolvedValue({error:{code:"weak_password",message:"private diagnostic"}});
 await expect(updatePassword(form())).rejects.toThrow("/reset-password?error=");
});
