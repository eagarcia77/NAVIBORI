import Link from "next/link";
import XrCapabilityCard from "@/components/xr/xr-capability-card";

export default function ArPage() {
  return (
    <main className="xr-page">
      <header className="xr-header">
        <div>
          <p className="eyebrow">NAVIBORI AR</p>
          <h1>AR Wayfinding <span>Prototype</span></h1>
          <p>QR-first positioning · verified routes only</p>
        </div>
        <Link href="/" className="studio-back-link">Mapa</Link>
      </header>

      <section className="xr-grid">
        <XrCapabilityCard mode="AR" />
        <section className="xr-card">
          <h2>Estado del prototipo</h2>
          <p>La navegación AR permanece bloqueada hasta que exista un QR anchor verificado y un grafo de rutas validado para el lugar.</p>
          <ol>
            <li>Escanear QR anchor validado.</li>
            <li>Resolver piso y nodo conocido.</li>
            <li>Seleccionar destino.</li>
            <li>Calcular ruta validada.</li>
            <li>Mostrar indicaciones derivadas de la ruta.</li>
          </ol>
          <button type="button" disabled>Iniciar AR</button>
          <p className="xr-note">No se utilizará una posición interior inventada ni estimada como si fuera exacta.</p>
        </section>
      </section>
    </main>
  );
}
