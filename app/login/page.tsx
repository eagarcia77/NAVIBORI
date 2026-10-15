import Link from "next/link";
import { login, signup, resendConfirmation } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">NAVIBORI Studio</p>
        <h1 id="login-title">Acceso espacial</h1>
        <p>
          El inicio de sesión identifica al usuario; los permisos de edición dependen de
          membresías asignadas en cada venue.
        </p>

        {params.error && <p className="auth-alert error" role="alert">{params.error}</p>}
        {params.message && <p className="auth-alert" role="status">{params.message}</p>}

        <form className="auth-form">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="email" required />

          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />

          <div className="auth-actions">
            <button formAction={login}>Iniciar sesión</button>
            <button className="secondary" formAction={signup}>Crear cuenta</button>
          </div>
        </form>

        <section className="auth-resend-section" aria-labelledby="resend-confirmation-title">
          <h2 id="resend-confirmation-title">¿No recibiste el correo de confirmación?</h2>
          <p>Solicita otro enlace para verificar tu cuenta. Revisa también Spam y Promociones.</p>
          <form action={resendConfirmation} className="auth-resend-form">
            <label htmlFor="confirmationEmail">Correo electrónico de tu cuenta</label>
            <input id="confirmationEmail" name="confirmationEmail" type="email"
              autoComplete="email" maxLength={254} required placeholder="tu@correo.com" />
            <button type="submit">Reenviar correo de confirmación</button>
          </form>
          <small>El envío depende de la configuración SMTP de NAVIBORI.
            Esta solicitud no concede acceso administrativo.</small>
        </section>

        <p className="xr-note">
          Registrarse no concede acceso administrativo automáticamente.
        </p>
        <Link href="/">Volver a NAVIBORI</Link>
      </section>
    </main>
  );
}
