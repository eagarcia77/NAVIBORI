import Link from "next/link";
import MapFailureBoundary from "@/components/commerce/map-failure-boundary";
import NaviboriMap from "@/components/navibori-map";
import {DEMO_COMMERCE} from "@/lib/commerce/demo";
import {getPublicCommerce} from "@/lib/commerce/public-data";
import type {CommerceProfile} from "@/lib/commerce/types";

export default async function Home() {
  let liveBusinesses:CommerceProfile[]=[];

  try{
    liveBusinesses=await getPublicCommerce();
  }catch{
    liveBusinesses=[];
  }

  const usingLive=liveBusinesses.length>0;
  const businesses=usingLive ? liveBusinesses : DEMO_COMMERCE;

  return (
    <main className="navibori-full-map-page">
      <MapFailureBoundary fallback={<section style={{minHeight:"100dvh",display:"grid",alignContent:"center",gap:16,padding:24,maxWidth:"48rem",margin:"0 auto"}}>
        <h1>El mapa no está disponible en este navegador</h1>
        <p>Puedes seguir consultando los comercios y administrar tus anuncios. Para volver al mapa, revisa el soporte de gráficos de tu navegador.</p>
        <nav aria-label="Opciones sin mapa" style={{display:"flex",flexWrap:"wrap",gap:20}}>
          <Link href="/comercios">Ver comercios y ofertas</Link>
          <Link href="/merchant">Administrar mi comercio</Link>
        </nav>
      </section>}>
      <NaviboriMap
        businesses={businesses}
        source={usingLive ? "live" : "demo"}
        buildRevision={(process.env.RENDER_GIT_COMMIT || "local").slice(0,7)}
      />
      </MapFailureBoundary>
    </main>
  );
}
