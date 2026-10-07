"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { activePromotions, featuredOffers, filterCommerce } from "@/lib/commerce/catalog";
import { DEMO_COMMERCE } from "@/lib/commerce/demo";
import { getCommerceOpenState } from "@/lib/commerce/hours";
import { appendCommerceEvent, type CommerceAnalyticsEvent } from "@/lib/commerce/analytics";
import { buildBusinessDeepLink } from "@/lib/commerce/deep-link";
import type { CommerceCategory, CommerceProfile } from "@/lib/commerce/types";

const categories: Array<{value:"all"|CommerceCategory;label:string}> = [
  { value:"all", label:"Todos" },
  { value:"gastronomia", label:"Gastronomía" },
  { value:"compras", label:"Compras" },
  { value:"artesania", label:"Artesanía" },
  { value:"servicios", label:"Servicios" },
  { value:"bienestar", label:"Bienestar" }
];

export default function CommerceDirectory({
  initialBusinesses=DEMO_COMMERCE,
  source="demo"
}:{
  initialBusinesses?:CommerceProfile[];
  source?:"live"|"demo";
}) {
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState<"all"|CommerceCategory>("all");
  const [promosOnly,setPromosOnly] = useState(false);
  const [selectedId,setSelectedId] = useState(initialBusinesses[0]?.id ?? "");
  const [favorites,setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("navibori:favorites") ?? "[]");
    } catch {
      return [];
    }
  });

  const businesses = useMemo(
    () => filterCommerce(initialBusinesses,{query,category,promotionsOnly:promosOnly}),
    [initialBusinesses,query,category,promosOnly]
  );

  const selected = initialBusinesses.find((item) => item.id === selectedId) ?? businesses[0];

  function readEvents(): CommerceAnalyticsEvent[] {
    try {
      return JSON.parse(localStorage.getItem("navibori:commerce-events") ?? "[]");
    } catch {
      return [];
    }
  }

  function record(type: CommerceAnalyticsEvent["type"], businessId: string) {
    const next = appendCommerceEvent(readEvents(),{
      businessId,
      type,
      occurredAt:new Date().toISOString()
    });
    localStorage.setItem("navibori:commerce-events",JSON.stringify(next));
  }

  function selectBusiness(id:string) {
    setSelectedId(id);
    record("profile_view",id);
  }

  async function shareBusiness() {
    if (!selected || typeof window === "undefined") return;
    const link=buildBusinessDeepLink(window.location.origin,selected.slug);
    await navigator.clipboard?.writeText(link);
    record("share",selected.id);
  }

  function toggleFavorite(id:string) {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current,id];
      if (!current.includes(id)) record("favorite",id);
      localStorage.setItem("navibori:favorites",JSON.stringify(next));
      return next;
    });
  }

  return (
    <section className="commerce-shell">
      <div className="commerce-toolbar">
        <input
          value={query}
          onChange={(event)=>setQuery(event.target.value)}
          placeholder="Buscar comercio, producto o servicio..."
          aria-label="Buscar comercios"
        />
        <button
          type="button"
          className={promosOnly ? "active" : ""}
          onClick={()=>setPromosOnly((value)=>!value)}
        >
          Promociones
        </button>
      </div>

      <div className="commerce-categories" role="group" aria-label="Categorías de comercios">
        {categories.map((item)=>(
          <button
            type="button"
            key={item.value}
            className={category===item.value ? "active" : ""}
            onClick={()=>setCategory(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="commerce-layout">
        <div className="commerce-list" aria-label="Directorio de comercios">
          {businesses.map((business)=>{
            const promoCount = activePromotions(business).length;
            return (
              <button
                type="button"
                key={business.id}
                className={"commerce-card " + (selected?.id===business.id ? "selected" : "")}
                onClick={()=>selectBusiness(business.id)}
              >
                <div>
                  <span className="commerce-demo-badge">{source==="live" ? "LIVE DATA" : "DEMO"}</span>
                  <strong>{business.name}</strong>
                  <small>{business.category} · {business.locationLabel}</small>
                </div>
                <div className="commerce-card-meta">
                  {promoCount>0 && <span>{promoCount} promo</span>}
                  <span>{featuredOffers(business).length} destacados</span>
                </div>
              </button>
            );
          })}
          {businesses.length===0 && (
            <div className="commerce-empty">No hay resultados con esos filtros.</div>
          )}
        </div>

        {selected && (
          <article className="commerce-detail">
            <div className="commerce-detail-head">
              <div>
                <span className="commerce-demo-badge">{source==="live" ? "DATOS PUBLICADOS" : "DATOS SINTÉTICOS"}</span>
                <h2>{selected.name}</h2>
                <p>{selected.description}</p>
              </div>
              <button
                type="button"
                aria-pressed={favorites.includes(selected.id)}
                onClick={()=>toggleFavorite(selected.id)}
              >
                {favorites.includes(selected.id) ? "★ Guardado" : "☆ Guardar"}
              </button>
            </div>

            <div className="commerce-facts">
              <div><span>Ubicación</span><strong>{selected.locationLabel}</strong></div>
              <div><span>Routing</span><strong>{selected.verifiedLocation ? "Disponible" : "Pendiente"}</strong></div>
              <div>
                <span>{source==="live" ? "Horario" : "Horario demo"}</span>
                <strong>
                  {getCommerceOpenState(selected.hours).label}
                  {getCommerceOpenState(selected.hours).next ? " · " + getCommerceOpenState(selected.hours).next : ""}
                </strong>
              </div>
            </div>

            <section>
              <h3>Productos o servicios destacados</h3>
              <div className="offer-grid">
                {featuredOffers(selected).map((offer)=>(
                  <article key={offer.id}>
                    <strong>{offer.title}</strong>
                    {offer.description && <p>{offer.description}</p>}
                    {typeof offer.price === "number" && <span>{"$" + offer.price.toFixed(2)}</span>}
                  </article>
                ))}
              </div>
            </section>

            {activePromotions(selected).length>0 && (
              <section>
                <h3>Promociones</h3>
                {activePromotions(selected).map((promotion)=>(
                  <button
                    type="button"
                    className="promo-card"
                    key={promotion.id}
                    onClick={()=>record("promotion_view",selected.id)}
                  >
                    <strong>{promotion.title}</strong>
                    <p>{promotion.description}</p>
                  </button>
                ))}
              </section>
            )}

            <div className="commerce-actions">
              {selected.verifiedLocation ? (
                <Link
                  className="commerce-profile-link"
                  href={"/?business="+selected.slug}
                  onClick={()=>record("route_request",selected.id)}
                >
                  Cómo llegar
                </Link>
              ) : (
                <button type="button" disabled>Cómo llegar</button>
              )}

              {selected.phone ? (
                <a
                  className="commerce-profile-link"
                  href={"tel:"+selected.phone}
                  onClick={()=>record("contact_click",selected.id)}
                >
                  Llamar
                </a>
              ) : (
                <button type="button" disabled>Llamar</button>
              )}

              {selected.whatsapp ? (
                <a
                  className="commerce-profile-link"
                  href={"https://wa.me/"+selected.whatsapp.replace(/\D/g,"")}
                  target="_blank"
                  rel="noreferrer"
                  onClick={()=>record("contact_click",selected.id)}
                >
                  WhatsApp
                </a>
              ) : (
                <button type="button" disabled>WhatsApp</button>
              )}

              {selected.website ? (
                <a
                  className="commerce-profile-link"
                  href={selected.website}
                  target="_blank"
                  rel="noreferrer"
                  onClick={()=>record("contact_click",selected.id)}
                >
                  Sitio web
                </a>
              ) : (
                <button type="button" disabled>Sitio web</button>
              )}
              <Link className="commerce-profile-link" href={"/comercios/"+selected.slug}>Ver perfil</Link>
              <button type="button" onClick={shareBusiness}>Copiar enlace</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
