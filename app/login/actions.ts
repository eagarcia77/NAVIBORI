"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  redirect("/studio");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: email.split("@")[0] }
    }
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/login?message=" + encodeURIComponent("Cuenta creada. Si Supabase solicita confirmación, revise su correo antes de iniciar sesión."));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
