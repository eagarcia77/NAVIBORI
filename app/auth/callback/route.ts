import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Handles the PKCE redirect after the user clicks a Supabase
 * confirmation link. No next URL or arbitrary redirect target is accepted.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL(
      "/login?error=" + encodeURIComponent("Falta el código de confirmación."),
      url.origin
    ));
  }

  const supabase = await createClient();
  let error: {message:string}|null=null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && (type === "signup" || type === "email")) {
    const result = await supabase.auth.verifyOtp({type,token_hash:tokenHash});
    error = result.error;
  } else {
    return NextResponse.redirect(new URL(
      "/login?error=" + encodeURIComponent("El enlace de confirmación no es válido."),
      url.origin
    ));
  }

  if (error) {
    return NextResponse.redirect(new URL(
      "/login?error=" + encodeURIComponent(
        "No se pudo verificar el enlace. Solicita otro correo de confirmación."
      ),url.origin
    ));
  }

  return NextResponse.redirect(new URL(
    "/login?message=" + encodeURIComponent(
      "Correo verificado correctamente. Ya puedes iniciar sesión."
    ),url.origin
  ));
}
