import Link from "next/link";
import { login, signup } from "./actions";

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

        <p className="xr-note">
          Registrarse no concede acceso administrativo automáticamente.
        </p>
        <Link href="/">Volver a NAVIBORI</Link>
      </section>
    </main>
  );
}
