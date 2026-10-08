"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import {
  summarizeDailyMetrics,
  type DailyMetricRow
} from "@/lib/commerce/metric-summary";

const RANGES=[7,30,90] as const;
type RangeDays=(typeof RANGES)[number];

function isoDateDaysAgo(days:number){
  const date=new Date();
  date.setDate(date.getDate()-days);
  return date.toISOString().slice(0,10);
}

export default function MerchantAnalyticsDashboard(){
  const [range,setRange]=useState<RangeDays>(30);
  const [rows,setRows]=useState<DailyMetricRow[]>([]);
  const [businessName,setBusinessName]=useState("");
  const [status,setStatus]=useState("Cargando métricas…");

  useEffect(()=>{
    let active=true;

    (async()=>{
      try{
        const business=await getOwnedMerchantBusiness();
        if(!active) return;

        if(!business){
          setRows([]);
          setBusinessName("");
          setStatus("Todavía no existe un comercio conectado a esta cuenta.");
          return;
        }

        setBusinessName(business.name);

        const supabase=createClient();
        const start=isoDateDaysAgo(range-1);
        const {data,error}=await supabase
          .from("business_daily_metrics")
          .select("*")
          .eq("business_id",business.id)
          .gte("metric_date",start)
          .order("metric_date",{ascending:true});

        if(error) throw error;
        if(!active) return;

        setRows(data ?? []);
        setStatus(
          (data ?? []).length
            ? "Métricas agregadas · sin identidad de visitante."
            : "Todavía no hay actividad agregada para este periodo."
        );
      }catch(error){
        if(active){
          setRows([]);
          setStatus(error instanceof Error ? error.message : "No se pudieron cargar las métricas.");
        }
      }
    })();

    return ()=>{active=false};
  },[range]);

  const summary=useMemo(()=>summarizeDailyMetrics(rows),[rows]);
  const maxViews=Math.max(1,...rows.map((row)=>Number(row.profile_views)));

  return (
    <section className="merchant-analytics-dashboard">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">MERCHANT ANALYTICS</p>
          <h2>Rendimiento histórico</h2>
          {businessName && <small>{businessName}</small>}
        </div>

        <div className="merchant-range-switch" aria-label="Periodo de analítica">
          {RANGES.map((days)=>(
            <button
              type="button"
              key={days}
              className={range===days ? "active" : ""}
              onClick={()=>setRange(days)}
              aria-pressed={range===days}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="merchant-analytics-summary">
        <article><span>Vistas</span><strong>{summary.profileViews}</strong></article>
        <article><span>Favoritos</span><strong>{summary.favorites}</strong></article>
        <article><span>Promociones</span><strong>{summary.promotionViews}</strong></article>
        <article><span>Rutas</span><strong>{summary.routeRequests}</strong></article>
        <article><span>Contactos</span><strong>{summary.contactClicks}</strong></article>
        <article><span>Compartidos</span><strong>{summary.shares}</strong></article>
      </div>

      <div className="merchant-analytics-chart" aria-label="Vistas diarias del comercio">
        {rows.map((row)=>(
          <div className="merchant-analytics-day" key={row.metric_date}>
            <div className="merchant-analytics-bar-track" aria-hidden="true">
              <span
                style={{
                  height:Math.max(4,(Number(row.profile_views)/maxViews)*100)+"%"
                }}
              />
            </div>
            <b>{row.profile_views}</b>
            <small>{row.metric_date.slice(5)}</small>
          </div>
        ))}

        {rows.length===0 && (
          <div className="merchant-analytics-empty">
            La gráfica aparecerá cuando un comercio publicado comience a recibir actividad.
          </div>
        )}
      </div>

      <footer className="merchant-analytics-footer">
        <span>Interacciones: <strong>{summary.engagement}</strong></span>
        <span>Privacidad: agregación diaria, sin IP ni perfil individual.</span>
      </footer>
    </section>
  );
}
