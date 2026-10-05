import NaviboriMap from "@/components/navibori-map";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Puerto Rico Spatial Experience Platform</p>
          <h1>NAVIBORI <span>XR</span></h1>
          <p className="pilot">Pilot 001 · Mercado Metropolitano de Juana Díaz</p>
        </div>
        <button className="guide-button" type="button" aria-label="Abrir Navi, guía de NAVIBORI">
          Navi
        </button>
      </header>

      <section className="search-row" aria-label="Explorar">
        <label className="search">
          <span className="sr-only">Buscar lugares y experiencias</span>
          <input placeholder="Buscar lugares, comida, eventos..." />
        </label>
        <button type="button">Filtros</button>
      </section>

      <NaviboriMap />

      <nav className="bottom-nav" aria-label="Navegación principal">
        <button className="active" type="button">Explorar</button>
        <button type="button">AR</button>
        <button type="button">VR</button>
        <button type="button">Guardados</button>
        <button type="button">Perfil</button>
      </nav>
    </main>
  );
}
