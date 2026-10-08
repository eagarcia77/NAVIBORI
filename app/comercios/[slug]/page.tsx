import Link from "next/link";
import { notFound } from "next/navigation";
import NaviboriBrand from "@/components/brand/navibori-brand";
import NaviGuide from "@/components/brand/navi-guide";
import BusinessMetricBeacon from "@/components/commerce/business-metric-beacon";
import { getCommerceBySlug, getCommerceSlugs } from "@/lib/commerce/lookup";
import { getPublicCommerceBySlug } from "@/lib/commerce/public-data";
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

  let liveBusiness=null;
  try{
    liveBusiness=await getPublicCommerceBySlug(slug);
  }catch{
    liveBusiness=null;
  }

  const business=liveBusiness ?? getCommerceBySlug(slug);
  if(!business) notFound();

  const isLive=!business.demo;
  const openState=getCommerceOpenState(business.hours);

  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">BUSINESS PROFILE · {isLive ? "LIVE" : "DEMO"}</p>
          <h1>{business.name}</h1>
          <p>{business.description}</p>
        </div>
        <div className="subpage-actions">
          <Link href="/comercios">Todos los comercios</Link>
          <Link href="/">Mapa</Link>
        </div>
      </header>

      <div className={isLive ? "live-data-notice" : "demo-notice"}>
        {isLive
          ? "Perfil publicado desde NAVIBORI Commerce. Los datos visibles fueron habilitados para consulta pública."
          : "Perfil sintético para demostrar la experiencia comercial. No representa un negocio real del Mercado Metropolitano."}
      </div>

      <section className="business-profile">
        <div className="business-profile-main">
          {(business.cover || business.logo) && (
            <section className="business-visual-identity" aria-label="Identidad visual del comercio">
              {business.cover && (
                <img
                  className="business-cover"
                  src={business.cover.url}
                  alt={business.cover.altText}
                />
              )}
              {business.logo && (
                <img
                  className="business-logo"
                  src={business.logo.url}
                  alt={business.logo.altText}
                />
              )}
            </section>
          )}
          <div className="business-profile-state">
            <span className="commerce-demo-badge">{isLive ? "LIVE DATA" : "DEMO"}</span>
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
              {business.offers.length===0 && (
                <p className="commerce-empty">Este comercio todavía no ha publicado productos o servicios.</p>
              )}
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

          {business.gallery && business.gallery.length>0 && (
            <section>
              <h2>Galería</h2>
              <div className="business-gallery">
                {business.gallery.map((image)=>(
                  <figure key={image.id}>
                    <img src={image.url} alt={image.altText} />
                    <figcaption>{image.altText}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2>{isLive ? "Horario" : "Horario demo"}</h2>
            <div className="hours-grid">
              {business.hours.map((item)=>(
                <div key={item.day}>
                  <span>{item.day.toUpperCase()}</span>
                  <strong>{item.closed ? "Cerrado" : item.opens + " – " + item.closes}</strong>
                </div>
              ))}
              {business.hours.length===0 && (
                <p className="commerce-empty">Horario no publicado.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="business-profile-side">
          <h2>Acciones</h2>
          <Link href={"/?business="+business.slug}>Ver en mapa</Link>

          {business.verifiedLocation ? (
            <Link href={"/?business="+business.slug}>Cómo llegar</Link>
          ) : (
            <button type="button" disabled>Cómo llegar</button>
          )}

          {business.phone ? (
            <a href={"tel:"+business.phone}>Llamar</a>
          ) : (
            <button type="button" disabled>Llamar</button>
          )}

          {business.whatsapp ? (
            <a
              href={"https://wa.me/"+business.whatsapp.replace(/\D/g,"")}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <button type="button" disabled>WhatsApp</button>
          )}

          {business.website ? (
            <a href={business.website} target="_blank" rel="noreferrer">Sitio web</a>
          ) : (
            <button type="button" disabled>Sitio web</button>
          )}

          <p>
            {business.verifiedLocation
              ? "La ubicación publicada puede utilizarse como contexto para routing."
              : "La ubicación exacta todavía no está validada; NAVIBORI no inventará coordenadas."}
          </p>
        </aside>
      </section>

      <BusinessMetricBeacon businessId={business.id} enabled={isLive} />
      <NaviGuide mode="cockpit" />
    </main>
  );
}
