"use client";

import { useEffect, useState } from "react";
import { isPromotionActive } from "@/lib/commerce/catalog";
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
        {saved && <span role="status">Promoción guardada.</span>}
      </div>
    </section>
  );
}
