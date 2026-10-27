import Link from "next/link";
import { login, signup, resendConfirmation, socialLogin } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let providers: Record<string, boolean> = {};
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/settings", {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
      cache: "no-store", signal: AbortSignal.timeout(5000)
    });
    if (response.ok) providers = (await response.json()).external ?? {};
  } catch {}


  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">NAVIBORI · Comerciantes</p>
        <h1 id="login-title">Accede a tu comercio</h1>
        <p>
          Inicia sesión para registrar tu negocio y administrar sus anuncios.
          Cada cuenta solo puede editar los comercios para los que tiene permiso.
        </p>

        {params.error && <p className="auth-alert error" role="alert">{params.error}</p>}
        {params.message && <p className="auth-alert" role="status">{params.message}</p>}

        <div className="auth-form" aria-label="Acceso con otras cuentas">
          {([ ["google", "Google"], ["azure", "Microsoft"], ["apple", "Apple"] ] as const).map(([provider, label]) => (
            <form action={socialLogin} key={provider}>
              <input type="hidden" name="provider" value={provider} />
              <button type="submit" disabled={!providers[provider]}>Continuar con {label}</button>
              {!providers[provider] && <small>{label}: pendiente de configuración.</small>}
            </form>
          ))}
          <p>Crear tu cuenta identifica al titular. La publicación del comercio requiere revisión.</p>
        </div>
        <form className="auth-form">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="email" required />

          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />

          <div className="auth-actions">
            <button formAction={login}>Iniciar sesión</button>
            <button className="secondary" formAction={signup}>Crear cuenta</button>
          </div>
        </form>

        <p><Link href="/forgot-password">¿Olvidaste tu contraseña?</Link></p>

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
