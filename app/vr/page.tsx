import Link from "next/link";
import XrCapabilityCard from "@/components/xr/xr-capability-card";

export default function VrPage() {
  return (
    <main className="xr-page">
      <header className="xr-header">
        <div>
          <p className="eyebrow">NAVIBORI VR / Twin</p>
          <h1>Immersive Venue <span>Prototype</span></h1>
          <p>Browser-first digital twin · headset optional</p>
        </div>
        <Link href="/" className="studio-back-link">Mapa</Link>
      </header>

      <section className="xr-grid">
        <XrCapabilityCard mode="VR" />
        <section className="xr-card">
          <h2>Digital Twin</h2>
          <p>El visor 3D utilizará la misma geometría, POI, eventos y comercios del modelo espacial canónico.</p>
          <p>Hasta recibir el plano validado del piloto, NAVIBORI no mostrará una reconstrucción ficticia del Mercado Metropolitano.</p>
          <button type="button" disabled>Abrir Twin</button>
          <p className="xr-note">El modo 3D de navegador será el fallback para dispositivos sin WebXR.</p>
        </section>
      </section>
    </main>
  );
}
