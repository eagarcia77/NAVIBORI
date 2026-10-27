"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {newPassword,accountError} from "@/lib/auth/account-input";
export async function updatePassword(form:FormData){
  const input=newPassword(form);
  if(input.error)redirect("/reset-password?error="+encodeURIComponent(input.error));
  const supabase=await createClient();
  const {data:{user},error:sessionError}=await supabase.auth.getUser();
  if(sessionError||!user||user.is_anonymous)redirect("/forgot-password?error="+encodeURIComponent("El enlace o la sesión venció. Solicita un enlace nuevo."));
  const {error}=await supabase.auth.updateUser({password:input.password});
  if(error)redirect("/reset-password?error="+encodeURIComponent(accountError(error.code)));
  // Keep the established session; no success is claimed unless Auth accepted the update.
  redirect("/merchant?passwordUpdated=1");
}
