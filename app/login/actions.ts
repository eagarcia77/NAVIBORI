"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeConfirmationEmail, NAVIBORI_AUTH_CALLBACK_URL } from "@/lib/auth/email-confirmation";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    throw new Error("Email y contraseña son requeridos.");
  }

  return { email, password };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/merchant");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: NAVIBORI_AUTH_CALLBACK_URL,
      data: { display_name: email.split("@")[0] }
    }
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/login?message=" + encodeURIComponent("Cuenta creada. Si Supabase solicita confirmación, revise su correo antes de iniciar sesión."));
}

export async function resendConfirmation(formData: FormData) {
  const email = normalizeConfirmationEmail(formData.get("confirmationEmail"));
  if (!email) {
    redirect("/login?error=" + encodeURIComponent("Escribe un correo electrónico válido."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: NAVIBORI_AUTH_CALLBACK_URL }
  });

  if (error) {
    // Never log the submitted address or reveal whether an account exists.
    console.warn("NAVIBORI signup confirmation resend failed:", {
      status: error.status, code: error.code
    });
    redirect("/login?error=" + encodeURIComponent(
      "No se pudo solicitar la confirmación. Verifica la configuración de correo SMTP de NAVIBORI e inténtalo después."
    ));
  }

  // Supabase may intentionally return success even when an email is unknown.
  redirect("/login?message=" + encodeURIComponent(
    "Si la cuenta existe y está pendiente de confirmar, recibirás un enlace. Revisa Recibidos, Spam y Promociones."
  ));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function socialLogin(formData: FormData) {
  const provider = String(formData.get("provider"));
  if (provider !== "google" && provider !== "azure" && provider !== "apple") {
    redirect("/login?error=" + encodeURIComponent("Proveedor no válido."));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NAVIBORI_AUTH_CALLBACK_URL + "?flow=merchant",
      ...(provider === "azure" ? { scopes: "email" } : {})
    }
  });
  if (error || !data.url) {
    redirect("/login?error=" + encodeURIComponent("Este acceso todavía no está disponible. Utiliza tu correo electrónico."));
  }
  redirect(data.url);
}
