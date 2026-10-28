import Link from "next/link";
import TwinSandbox from "@/components/twin/twin-sandbox";

export default function TwinPage() {
  return (
    <main className="xr-page">
      <header className="xr-header">
        <div>
          <p className="eyebrow">NAVIBORI Twin Lab</p>
          <h1>Digital Twin <span>Sandbox</span></h1>
          <p>Generic technology validation environment</p>
        </div>
        <Link href="/vr" className="studio-back-link">VR</Link>
      </header>
      <section className="twin-page-grid">
        <TwinSandbox />
        <aside className="xr-card">
          <h2>Objetivo</h2>
          <p>Validar Three.js, rendering responsive y la futura transformación del modelo espacial canónico a una escena 3D.</p>
          <p>Cuando exista geometría verificada, el sandbox será sustituido por capas generadas desde PostGIS.</p>
        </aside>
      </section>
    </main>
  );
}
