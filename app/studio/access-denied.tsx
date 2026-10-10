import Link from "next/link";
import { logout } from "@/app/login/actions";

export default function StudioAccessDenied({ email }: { email: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">NAVIBORI Studio</p>
        <h1>Cuenta autenticada, sin permisos de venue</h1>
        <p>
          La cuenta <strong>{email}</strong> inició sesión correctamente, pero todavía no
          posee una membresía administrativa en ningún venue.
        </p>
        <p className="xr-note">
          Este bloqueo es intencional: registrarse nunca concede privilegios de edición.
        </p>
        <form action={logout}><button type="submit">Cerrar sesión</button></form>
        <Link href="/">Volver al mapa</Link>
      </section>
    </main>
  );
}
