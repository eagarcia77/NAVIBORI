import Link from "next/link";
import { notFound } from "next/navigation";
import NaviboriBrand from "@/components/brand/navibori-brand";
import NaviGuide from "@/components/brand/navi-guide";
import { getCommerceBySlug, getCommerceSlugs } from "@/lib/commerce/lookup";
import { getCommerceOpenState } from "@/lib/commerce/hours";
import { activePromotions } from "@/lib/commerce/catalog";

export function generateStaticParams(){
  return getCommerceSlugs().map((slug)=>({slug}));
}

export default async function BusinessProfilePage({
  params
}:{
  params:Promise<{slug:string}>;
}){
  const {slug}=await params;
  const business=getCommerceBySlug(slug);
  if(!business) notFound();

  const openState=getCommerceOpenState(business.hours);

  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">BUSINESS PROFILE</p>
          <h1>{business.name}</h1>
          <p>{business.description}</p>
        </div>
        <div className="subpage-actions">
          <Link href="/comercios">Todos los comercios</Link>
          <Link href="/">Mapa</Link>
        </div>
      </header>

      <div className="demo-notice">
        Perfil sintético para demostrar la experiencia comercial. No representa un negocio real del Mercado Metropolitano.
      </div>

      <section className="business-profile">
        <div className="business-profile-main">
          <div className="business-profile-state">
            <span className="commerce-demo-badge">DEMO</span>
            <span className={"merchant-verification-badge " + business.verification}>
              {business.verification}
            </span>
            <strong>{openState.label}{openState.next ? " · " + openState.next : ""}</strong>
          </div>

          <div className="business-profile-facts">
            <div><span>Categoría</span><strong>{business.category}</strong></div>
            <div><span>Ubicación</span><strong>{business.locationLabel}</strong></div>
            <div><span>Routing</span><strong>{business.verifiedLocation ? "Disponible" : "Pendiente"}</strong></div>
          </div>

          <section>
            <h2>Productos y servicios</h2>
            <div className="offer-grid">
              {business.offers.map((offer)=>(
                <article key={offer.id} className={!offer.available ? "offer-unavailable" : ""}>
                  <div className="offer-status-row">
                    <strong>{offer.title}</strong>
                    <span>{offer.available ? "Disponible" : "Agotado"}</span>
                  </div>
                  {offer.description && <p>{offer.description}</p>}
                  {typeof offer.price==="number" && <b>{"$" + offer.price.toFixed(2)}</b>}
                </article>
              ))}
            </div>
          </section>

          {activePromotions(business).length>0 && (
            <section>
              <h2>Promociones</h2>
              {activePromotions(business).map((promotion)=>(
                <article className="promo-card" key={promotion.id}>
                  <strong>{promotion.title}</strong>
                  <p>{promotion.description}</p>
                </article>
              ))}
            </section>
          )}

          <section>
            <h2>Horario demo</h2>
            <div className="hours-grid">
              {business.hours.map((item)=>(
                <div key={item.day}>
                  <span>{item.day.toUpperCase()}</span>
                  <strong>{item.closed ? "Cerrado" : item.opens + " – " + item.closes}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="business-profile-side">
          <h2>Acciones</h2>
          <Link href={"/?business="+business.slug}>Ver en mapa</Link>
          <button type="button" disabled={!business.verifiedLocation}>Cómo llegar</button>
          {business.phone ? <a href={"tel:"+business.phone}>Llamar</a> : <button type="button" disabled>Llamar</button>}
          {business.website ? <a href={business.website} target="_blank" rel="noreferrer">Sitio web</a> : <button type="button" disabled>Sitio web</button>}
          <p>El QR/NFC del comercio abrirá esta misma URL canónica.</p>
        </aside>
      </section>

      <NaviGuide mode="cockpit" />
    </main>
  );
}
