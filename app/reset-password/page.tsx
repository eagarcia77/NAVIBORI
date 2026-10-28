import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {updatePassword} from "./actions";
export const dynamic="force-dynamic";
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user||user.is_anonymous)redirect("/forgot-password?error="+encodeURIComponent("Abre un enlace de recuperación válido para cambiar tu contraseña."));
  const params=await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <p className="eyebrow">NAVIBORI · Comerciantes</p><h1>Establecer nueva contraseña</h1>
    <p>Cuenta: {user.email}. Usa al menos 8 caracteres y evita reutilizar otra contraseña.</p>
    {params.error&&<p className="auth-alert error" role="alert">{params.error}</p>}
    <form action={updatePassword} className="auth-form">
      <label htmlFor="password">Nueva contraseña</label>
      <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
      <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      <button type="submit">Guardar contraseña</button>
    </form>
    <Link href="/forgot-password">Solicitar otro enlace</Link>
  </section></main>;
}
