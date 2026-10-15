import Link from "next/link";
import { xenoConcepts } from "@/lib/innovation/xeno-registry";
import NaviboriBrand from "@/components/brand/navibori-brand";
import NaviGuide from "@/components/brand/navi-guide";

export const metadata = {
  title: "XENO Lab | NAVIBORI",
  description: "Frontier spatial-computing research for NAVIBORI."
};

export default function XenoPage() {
  return (
    <main className="xeno-shell">
      <header className="xeno-hero">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">NAVIBORI XENO RESEARCH LAB</p>
          <h1>Diseñado como si viniera del futuro. Construido con tecnología terrestre verificable.</h1>
          <p>
            XENO separa tecnologías disponibles, bridges nativos, hardware piloto,
            investigación y conceptos especulativos. No representa tecnología de origen extraterrestre real.
          </p>
        </div>
        <nav className="xeno-links" aria-label="XENO navigation">
          <Link href="/nova">NOVA</Link>
          <Link href="/">Mapa</Link>
        </nav>
      </header>

      <section className="xeno-principle">
        <strong>REALITY COMPILER</strong>
        <span>Place + Semantics + Time + Device + Consent + Accessibility → Best Reality</span>
      </section>

      <section className="xeno-principle">
        <strong>XENO CORE SYSTEMS</strong>
        <span>Reality Aura · Spatial Neural Field · Dimensional Portal Engine</span>
      </section>

      <section className="xeno-grid" aria-label="XENO systems">
        <article className="xeno-card">
          <div className="xeno-card-head">
            <h2>Reality Aura</h2>
            <span className="xeno-readiness web-now">web-now</span>
          </div>
          <p>
            Convierte estados publicados —operacionales, eventos, accesibilidad, cultura y predicción aprobada—
            en una presencia visual/sonora sin confundir predicción con hechos.
          </p>
        </article>

        <article className="xeno-card">
          <div className="xeno-card-head">
            <h2>Spatial Neural Field</h2>
            <span className="xeno-readiness research">research</span>
          </div>
          <p>
            Inferencia local con preferencia WebNN → WebGPU → Worker CPU. Nunca modifica geometría
            autoritativa y requiere consentimiento si utiliza sensores.
          </p>
        </article>

        <article className="xeno-card">
          <div className="xeno-card-head">
            <h2>Dimensional Portal Engine</h2>
            <span className="xeno-readiness hardware-pilot">hardware-pilot</span>
          </div>
          <p>
            Selecciona el renderer apropiado para panorama 360, Digital Twin o Gaussian Splat.
            El contenido del portal nunca sustituye el grafo oficial de navegación.
          </p>
        </article>
      </section>

      <section className="xeno-grid" aria-label="XENO concepts">
        {xenoConcepts.map((concept) => (
          <article className="xeno-card" key={concept.id}>
            <div className="xeno-card-head">
              <h2>{concept.name}</h2>
              <span className={"xeno-readiness " + concept.readiness}>{concept.readiness}</span>
            </div>
            <p>{concept.description}</p>
            <dl>
              <div><dt>Base terrestre</dt><dd>{concept.terrestrialBasis.join(" · ")}</dd></div>
              <div><dt>Privacidad</dt><dd>{concept.privacyClass}</dd></div>
              <div><dt>Datos espaciales verificados</dt><dd>{concept.requiresVerifiedSpatialData ? "sí" : "no bloqueantes"}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <section className="xeno-warning">
        <p className="eyebrow">XENO PRIME DIRECTIVE</p>
        <h2>Lo espectacular nunca sustituye la verdad física.</h2>
        <p>
          Predicción, RF sensing, IA, portales y renderers experimentales nunca pueden
          reemplazar geometría validada, rutas accesibles oficiales ni procedimientos de emergencia.
        </p>
      </section>
      <NaviGuide mode="xeno" />
    </main>
  );
}
