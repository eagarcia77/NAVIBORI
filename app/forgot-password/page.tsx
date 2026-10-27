import Link from "next/link";
import {requestPasswordReset} from "./actions";
export default async function ForgotPasswordPage({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
  const params=await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <p className="eyebrow">NAVIBORI · Comerciantes</p><h1>Recuperar contraseña</h1>
    <p>Escribe el correo de tu cuenta para solicitar un enlace de recuperación.</p>
    {params.error&&<p className="auth-alert error" role="alert">{params.error}</p>}
    {params.message&&<p className="auth-alert" role="status">{params.message}</p>}
    <form action={requestPasswordReset} className="auth-form">
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
      <button type="submit">Enviar enlace de recuperación</button>
    </form>
    <p>Abre el enlace en el mismo navegador donde lo solicitaste. Si venció, solicita uno nuevo.</p>
    <Link href="/login">Volver a iniciar sesión</Link>
  </section></main>;
}
