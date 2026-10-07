import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import CommerceDirectory from "@/components/commerce/commerce-directory";
import NaviGuide from "@/components/brand/navi-guide";

export const metadata = {
  title: "Comercios | NAVIBORI XR",
  description: "Directorio comercial espacial de NAVIBORI XR."
};

export default function CommercePage() {
  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">COMMERCE LAYER</p>
          <h1>Comercios</h1>
          <p>Descubre negocios, productos, servicios y promociones conectados al espacio.</p>
        </div>
        <div className="subpage-actions">
          <Link href="/merchant">Merchant Console</Link>
          <Link href="/">Volver al mapa</Link>
        </div>
      </header>

      <div className="demo-notice">
        Los comercios mostrados son sintéticos. No representan negocios reales del Mercado Metropolitano.
      </div>

      <CommerceDirectory />
      <NaviGuide mode="cockpit" />
    </main>
  );
}
