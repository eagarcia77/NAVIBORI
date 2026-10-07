"use client";

import { useMemo, useState } from "react";
import { activePromotions, featuredOffers, filterCommerce } from "@/lib/commerce/catalog";
import { DEMO_COMMERCE } from "@/lib/commerce/demo";
import type { CommerceCategory } from "@/lib/commerce/types";

const categories: Array<{value:"all"|CommerceCategory;label:string}> = [
  { value:"all", label:"Todos" },
  { value:"gastronomia", label:"Gastronomía" },
  { value:"compras", label:"Compras" },
  { value:"artesania", label:"Artesanía" },
  { value:"servicios", label:"Servicios" },
  { value:"bienestar", label:"Bienestar" }
];

export default function CommerceDirectory() {
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState<"all"|CommerceCategory>("all");
  const [promosOnly,setPromosOnly] = useState(false);
  const [selectedId,setSelectedId] = useState(DEMO_COMMERCE[0]?.id ?? "");
  const [favorites,setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("navibori:favorites") ?? "[]");
    } catch {
      return [];
    }
  });

  const businesses = useMemo(
    () => filterCommerce(DEMO_COMMERCE,{query,category,promotionsOnly:promosOnly}),
    [query,category,promosOnly]
  );

  const selected = DEMO_COMMERCE.find((item) => item.id === selectedId) ?? businesses[0];

  function toggleFavorite(id:string) {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current,id];
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
                onClick={()=>setSelectedId(business.id)}
              >
                <div>
                  <span className="commerce-demo-badge">DEMO</span>
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
                <span className="commerce-demo-badge">DATOS SINTÉTICOS</span>
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
              <div><span>Estado</span><strong>Demo · no representa horario real</strong></div>
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
                  <div className="promo-card" key={promotion.id}>
                    <strong>{promotion.title}</strong>
                    <p>{promotion.description}</p>
                  </div>
                ))}
              </section>
            )}

            <div className="commerce-actions">
              <button type="button" disabled={!selected.verifiedLocation}>Cómo llegar</button>
              <button type="button" disabled={!selected.phone}>Llamar</button>
              <button type="button" disabled={!selected.website}>Sitio web</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
