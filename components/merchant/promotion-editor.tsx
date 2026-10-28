"use client";

import { useEffect, useState } from "react";
import { isPromotionActive } from "@/lib/commerce/catalog";
import { createClient } from "@/lib/supabase/client";
import type { CommercePromotion } from "@/lib/commerce/types";

export default function PromotionEditor(){
  const [promotion,setPromotion]=useState<CommercePromotion>({
    id:"draft-promo",
    title:"",
    description:"",
    startsAt:"",
    endsAt:"",
    active:true
  });
  const [saved,setSaved]=useState(false);
  const [pushBusy,setPushBusy]=useState(false);
  const [pushStatus,setPushStatus]=useState("");

  useEffect(()=>{
    try{
      const stored=localStorage.getItem("navibori:merchant-promotion");
      if(stored) setPromotion(JSON.parse(stored));
    }catch{}
  },[]);

  function update<K extends keyof CommercePromotion>(key:K,value:CommercePromotion[K]){
    setSaved(false);
    setPromotion((current)=>({...current,[key]:value}));
  }

  function save(){
    localStorage.setItem("navibori:merchant-promotion",JSON.stringify(promotion));
    window.dispatchEvent(new Event("navibori:merchant-promotion-updated"));
    setSaved(true);
    setPushStatus("");
  }

  async function sendSpecialNow(){
    const businessId=localStorage.getItem("navibori:merchant-business-id");
    if(!businessId){
      setPushStatus("Sincroniza primero el comercio con Supabase.");
      return;
    }

    setPushBusy(true);
    setPushStatus("Enviando especial…");

    try{
      const supabase=createClient();
      const {data,error}=await supabase.functions.invoke(
        "send-promotion-push",
        {body:{businessId}}
      );

      if(error){
        throw error;
      }

      if(data?.duplicate){
        setPushStatus("Este especial ya fue enviado a los suscriptores.");
      }else{
        const sent=Number(data?.sentCount ?? 0);
        const failed=Number(data?.failedCount ?? 0);
        setPushStatus(
          sent>0
            ? "Especial enviado a "+sent+" dispositivo(s)."+
              (failed>0 ? " "+failed+" envío(s) no pudieron completarse." : "")
            : "No hay dispositivos suscritos todavía."
        );
      }
    }catch(error){
      setPushStatus(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el especial."
      );
    }finally{
      setPushBusy(false);
    }
  }

  const activeNow=isPromotionActive(promotion);

  return (
    <section className="merchant-promotion-editor">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">PROMOCIONES</p>
          <h2>Promoción programada</h2>
        </div>
        <span className={"promotion-state " + (activeNow?"active":"inactive")}>
          {activeNow?"Activa ahora":"Inactiva"}
        </span>
      </div>

      <div className="merchant-form-grid">
        <label>
          Título
          <input value={promotion.title} onChange={(e)=>update("title",e.target.value)} />
        </label>

        <label>
          Estado
          <select
            value={promotion.active?"active":"paused"}
            onChange={(e)=>update("active",e.target.value==="active")}
          >
            <option value="active">Activa</option>
            <option value="paused">Pausada</option>
          </select>
        </label>

        <label className="merchant-wide">
          Descripción
          <textarea
            rows={3}
            value={promotion.description}
            onChange={(e)=>update("description",e.target.value)}
          />
        </label>

        <label>
          Comienza
          <input
            type="datetime-local"
            value={promotion.startsAt ?? ""}
            onChange={(e)=>update("startsAt",e.target.value)}
          />
        </label>

        <label>
          Termina
          <input
            type="datetime-local"
            value={promotion.endsAt ?? ""}
            onChange={(e)=>update("endsAt",e.target.value)}
          />
        </label>
      </div>

      <div className="merchant-actions">
        <button type="button" onClick={save}>Guardar promoción</button>
        <button
          type="button"
          onClick={sendSpecialNow}
          disabled={pushBusy || !activeNow || !promotion.title.trim()}
        >
          {pushBusy ? "Enviando…" : "🔔 Enviar especial ahora"}
        </button>
        {saved && <span role="status">Promoción guardada.</span>}
        {pushStatus && <span role="status">{pushStatus}</span>}
      </div>

      <small>
        Las promociones activas con fecha/hora de inicio se revisan automáticamente cada 10 minutos.
        Cada promoción se envía una sola vez a usuarios que hayan activado “Recibir especiales”.
      </small>
    </section>
  );
}
