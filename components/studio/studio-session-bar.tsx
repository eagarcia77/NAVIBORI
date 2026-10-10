import { logout } from "@/app/login/actions";

export default function StudioSessionBar({
  email,
  venueName,
  roles
}: {
  email: string;
  venueName?: string;
  roles: string[];
}) {
  return (
    <aside className="studio-session" aria-label="Sesión de Studio">
      <div>
        <strong>{email}</strong>
        <span>{venueName ?? "Sin venue asignado"}</span>
        {roles.length > 0 && <span>Rol(es): {roles.join(", ")}</span>}
      </div>
      <form action={logout}>
        <button type="submit">Cerrar sesión</button>
      </form>
    </aside>
  );
}
