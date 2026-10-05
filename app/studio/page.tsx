import Link from "next/link";
import StudioWorkspace from "@/components/studio/studio-workspace";

export default function StudioPage() {
  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <p className="eyebrow">NAVIBORI Studio</p>
          <h1>Spatial CMS <span>v0.1</span></h1>
          <p className="pilot">Pilot workspace · Juana Díaz · demo data only</p>
        </div>
        <Link className="studio-back-link" href="/">Volver al mapa</Link>
      </header>
      <StudioWorkspace />
    </main>
  );
}
