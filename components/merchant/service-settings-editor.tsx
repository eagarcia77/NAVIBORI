"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";

type Settings={
  acceptsRequests:boolean;
  acceptsPickup:boolean;
  acceptsReservations:boolean;
  minLeadMinutes:number;
  maxAdvanceDays:number;
  instructions:string;
};

const defaults:Settings={
  acceptsRequests:true,
  acceptsPickup:false,
  acceptsReservations:false,
  minLeadMinutes:30,
  maxAdvanceDays:30,
  instructions:""
};

export default function ServiceSettingsEditor(){
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [businessStatus,setBusinessStatus]=useState<string|null>(null);
  const [verificationStatus,setVerificationStatus]=useState<string|null>(null);
  const [settings,setSettings]=useState<Settings>(defaults);
  const [status,setStatus]=useState("Verificando comercio…");
  const [busy,setBusy]=useState(false);

  const editable=
    Boolean(businessId) &&
    verificationStatus!=="pending" &&
    (businessStatus==="draft" || businessStatus==="active");

  useEffect(()=>{
    let active=true;

    (async()=>{
      try{
        const business=await getOwnedMerchantBusiness();
        if(!active) return;

        if(!business){
          setStatus("Sincroniza primero el perfil para configurar solicitudes.");
          return;
        }

        setBusinessId(business.id);
        setBusinessStatus(business.status);
        setVerificationStatus(business.verificationStatus);

        const supabase=createClient();
        const {data,error}=await supabase
          .from("business_service_settings")
          .select("*")
          .eq("business_id",business.id)
          .maybeSingle();

        if(error) throw error;
        if(!active) return;

        if(data){
          setSettings({
            acceptsRequests:data.accepts_requests,
            acceptsPickup:data.accepts_pickup,
            acceptsReservations:data.accepts_reservations,
            minLeadMinutes:data.min_lead_minutes,
            maxAdvanceDays:data.max_advance_days,
            instructions:data.instructions ?? ""
          });
        }

        setStatus(
          business.verificationStatus==="pending"
            ? "Configuración bloqueada mientras el comercio está en revisión."
            : "Define cómo quieres recibir solicitudes de clientes."
        );
      }catch(error){
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudo cargar la configuración.");
        }
      }
    })();

    return ()=>{active=false};
  },[]);

  function update<K extends keyof Settings>(key:K,value:Settings[K]){
    setSettings((current)=>({...current,[key]:value}));
  }

  async function save(){
    if(!businessId) return;
    setBusy(true);
    setStatus("Guardando configuración…");

    try{
      const supabase=createClient();
      const {error}=await supabase
        .from("business_service_settings")
        .upsert({
          business_id:businessId,
          accepts_requests:settings.acceptsRequests,
          accepts_pickup:settings.acceptsRequests && settings.acceptsPickup,
          accepts_reservations:settings.acceptsRequests && settings.acceptsReservations,
          min_lead_minutes:settings.minLeadMinutes,
          max_advance_days:settings.maxAdvanceDays,
          instructions:settings.instructions.trim() || null,
          updated_at:new Date().toISOString()
        },{onConflict:"business_id"});

      if(error) throw error;
      setStatus("Configuración de solicitudes guardada.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="merchant-service-settings">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">FULFILLMENT</p>
          <h2>Solicitudes, pickup y reservaciones</h2>
        </div>
        <span className={"commerce-lifecycle "+(businessStatus ?? "draft")}>
          {businessStatus ?? "local"}
        </span>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="service-setting-toggles">
        <label>
          <input
            type="checkbox"
            checked={settings.acceptsRequests}
            disabled={!editable || busy}
            onChange={(e)=>update("acceptsRequests",e.target.checked)}
          />
          Aceptar solicitudes
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.acceptsPickup}
            disabled={!editable || busy || !settings.acceptsRequests}
            onChange={(e)=>update("acceptsPickup",e.target.checked)}
          />
          Permitir pickup / recogido
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.acceptsReservations}
            disabled={!editable || busy || !settings.acceptsRequests}
            onChange={(e)=>update("acceptsReservations",e.target.checked)}
          />
          Permitir reservaciones / citas
        </label>
      </div>

      <div className="merchant-form-grid">
        <label>
          Tiempo mínimo de preparación
          <select
            value={settings.minLeadMinutes}
            disabled={!editable || busy}
            onChange={(e)=>update("minLeadMinutes",Number(e.target.value))}
          >
            <option value={0}>Sin mínimo</option>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
            <option value={120}>2 horas</option>
            <option value={1440}>1 día</option>
          </select>
        </label>

        <label>
          Reservar hasta
          <select
            value={settings.maxAdvanceDays}
            disabled={!editable || busy}
            onChange={(e)=>update("maxAdvanceDays",Number(e.target.value))}
          >
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
        </label>

        <label className="merchant-wide">
          Instrucciones para el cliente
          <textarea
            rows={3}
            value={settings.instructions}
            disabled={!editable || busy}
            onChange={(e)=>update("instructions",e.target.value)}
            placeholder="Ej. Te confirmaremos por WhatsApp antes de preparar el pedido."
          />
        </label>
      </div>

      <div className="merchant-actions">
        <button type="button" onClick={save} disabled={!editable || busy}>
          {busy ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>

      <small>
        NAVIBORI no confirma disponibilidad automáticamente: el comercio debe aceptar cada solicitud.
      </small>
    </section>
  );
}
