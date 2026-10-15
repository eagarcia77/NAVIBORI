import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import CommerceDirectory from "@/components/commerce/commerce-directory";
import NaviGuide from "@/components/brand/navi-guide";
import { DEMO_COMMERCE } from "@/lib/commerce/demo";
import { getPublicCommerce } from "@/lib/commerce/public-data";
import type { CommerceProfile } from "@/lib/commerce/types";

export const metadata = {
  title: "Comercios | NAVIBORI XR",
  description: "Directorio comercial espacial de NAVIBORI XR."
};

export default async function CommercePage() {
  let liveBusinesses:CommerceProfile[]=[];
  let loadError=false;

  try{
    liveBusinesses=await getPublicCommerce();
  }catch{
    loadError=true;
  }

  const usingLive=liveBusinesses.length>0;
  const businesses=usingLive ? liveBusinesses : DEMO_COMMERCE;

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

      <div className={usingLive ? "live-data-notice" : "demo-notice"}>
        {usingLive
          ? "Directorio conectado a comercios publicados y autorizados en NAVIBORI."
          : loadError
            ? "No se pudo consultar el directorio publicado. Se muestra el entorno DEMO sin representar comercios reales."
            : "Aún no hay comercios publicados. Se muestra el entorno DEMO sin representar negocios reales del Mercado Metropolitano."}
      </div>

      <CommerceDirectory
        initialBusinesses={businesses}
        source={usingLive ? "live" : "demo"}
      />
      <NaviGuide mode="cockpit" />
    </main>
  );
}
