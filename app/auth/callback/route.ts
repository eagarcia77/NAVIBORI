import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NAVIBORI_AUTH_CALLBACK_URL } from "@/lib/auth/email-confirmation";

/** Handles the PKCE redirect after the user clicks a Supabase
 * confirmation link. No next URL or arbitrary redirect target is accepted.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const trustedOrigin = new URL(NAVIBORI_AUTH_CALLBACK_URL).origin;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL(
      "/login?error=" + encodeURIComponent("Falta el código de confirmación."),
      trustedOrigin
    ));
  }

  const supabase = await createClient();
  let error: {message:string}|null=null;
  let recovery=false;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
    recovery="redirectType" in result.data && result.data.redirectType === "recovery";
  } else if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
    const result = await supabase.auth.verifyOtp({type,token_hash:tokenHash});
    error = result.error;
    recovery=type === "recovery";
  } else {
    return NextResponse.redirect(new URL(
      "/login?error=" + encodeURIComponent("El enlace de confirmación no es válido."),
      trustedOrigin
    ));
  }

  if (error) {
    return NextResponse.redirect(new URL(
      "/login?error=" + encodeURIComponent(
        "No se pudo verificar el enlace. Solicita uno nuevo de confirmación o recuperación y ábrelo en el mismo navegador."
      ),trustedOrigin
    ));
  }

  if(recovery)return NextResponse.redirect(new URL("/reset-password",trustedOrigin));

  if (url.searchParams.get("flow") === "merchant") {
    return NextResponse.redirect(new URL("/merchant", trustedOrigin));
  }

  return NextResponse.redirect(new URL(
    "/login?message=" + encodeURIComponent(
      "Correo verificado correctamente. Ya puedes iniciar sesión."
    ),trustedOrigin
  ));
}
