"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {normalizeConfirmationEmail,NAVIBORI_AUTH_CALLBACK_URL} from "@/lib/auth/email-confirmation";
import {accountError} from "@/lib/auth/account-input";
export async function requestPasswordReset(form:FormData){
  const email=normalizeConfirmationEmail(form.get("email"));
  if(!email)redirect("/forgot-password?error="+encodeURIComponent("Escribe un correo electrónico válido."));
  const supabase=await createClient();
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:NAVIBORI_AUTH_CALLBACK_URL});
  // Keep account existence private. Rate limits and mail-service failures are actionable.
  if(error&&error.code!=="user_not_found")redirect("/forgot-password?error="+encodeURIComponent(accountError(error.code)));
  redirect("/forgot-password?message="+encodeURIComponent("Si la cuenta permite recuperar la contraseña, recibirás un enlace. Revisa Recibidos y Spam. Ábrelo en el mismo navegador donde lo solicitaste."));
}
