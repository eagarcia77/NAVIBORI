"use client";

import { useEffect, useState } from "react";
import { DEMO_COMMERCE } from "@/lib/commerce/demo";
import {
  summarizeCommerceEvents,
  type CommerceAnalyticsEvent
} from "@/lib/commerce/analytics";

export default function MerchantPulse() {
  const [events,setEvents]=useState<CommerceAnalyticsEvent[]>([]);

  useEffect(()=>{
    try {
      setEvents(JSON.parse(localStorage.getItem("navibori:commerce-events") ?? "[]"));
    } catch {
      setEvents([]);
    }
  },[]);

  return (
    <section className="merchant-pulse" aria-labelledby="merchant-pulse-title">
      <div className="merchant-pulse-head">
        <div>
          <p className="eyebrow">MERCHANT PULSE · LOCAL DEMO</p>
          <h2 id="merchant-pulse-title">Actividad comercial</h2>
        </div>
        <span>Sin identidad de visitante</span>
      </div>

      <div className="merchant-pulse-grid">
        {DEMO_COMMERCE.map((business)=>{
          const summary=summarizeCommerceEvents(events,business.id);
          return (
            <article key={business.id}>
              <strong>{business.name}</strong>
              <div>
                <span><b>{summary.views}</b> vistas</span>
                <span><b>{summary.favorites}</b> favoritos</span>
                <span><b>{summary.promotionViews}</b> promos</span>
                <span><b>{summary.shares}</b> compartidos</span>
              </div>
            </article>
          );
        })}
      </div>
      <p className="merchant-pulse-note">
        Estas métricas existen solo en este navegador para demostrar el flujo. Producción usará agregación y umbrales de privacidad.
      </p>
    </section>
  );
}
