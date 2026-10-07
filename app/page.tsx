import Link from "next/link";
import NaviboriMap from "@/components/navibori-map";
import NaviboriBrand from "@/components/brand/navibori-brand";
import NaviGuide from "@/components/brand/navi-guide";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-stack">
          <p className="eyebrow">Puerto Rico Spatial Experience Platform</p>
          <NaviboriBrand />
          <p className="pilot">Pilot 001 · Mercado Metropolitano de Juana Díaz</p>
        </div>

        <div className="topbar-actions">
          <details className="lab-menu">
            <summary>Labs</summary>
            <div className="lab-menu-panel">
              <Link href="/nova">
                <strong>NOVA</strong>
                <span>Spatial Intelligence</span>
              </Link>
              <Link href="/xeno">
                <strong>XENO</strong>
                <span>Frontier Research</span>
              </Link>
            </div>
          </details>
          <Link className="studio-link" href="/studio">Studio</Link>
        </div>
      </header>

      <section className="search-row" aria-label="Explorar">
        <label className="search">
          <span className="sr-only">Buscar lugares y experiencias</span>
          <input placeholder="Buscar lugares, comida, eventos..." />
        </label>
        <button type="button">Filtros</button>
      </section>

      <section className="reality-status" aria-label="Estado de experiencia espacial">
        <div>
          <span className="reality-dot" aria-hidden="true" />
          <strong>Reality Core</strong>
          <span>Mapa 2D activo</span>
        </div>
        <div>
          <strong>Pilot 001</strong>
          <span>Plano interior pendiente</span>
        </div>
        <div>
          <strong>XR</strong>
          <span>AR/VR capability-gated</span>
        </div>
        <Link href="/nova">Escanear dispositivo</Link>
      </section>

      <NaviboriMap />
      <NaviGuide mode="cockpit" />

      <nav className="bottom-nav" aria-label="Navegación principal">
        <button className="active" type="button">Explorar</button>
        <Link href="/comercios">Comercios</Link>
        <Link href="/ar">AR</Link>
        <Link href="/twin">Twin</Link>
        <button type="button">Guardados</button>
        <button type="button">Perfil</button>
      </nav>
    </main>
  );
}
