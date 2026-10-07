"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Business = Database["public"]["Tables"]["businesses"]["Row"];

export interface ReviewSpace {
  id:string;
  label:string;
}

export default function CommerceReviewConsole({
  businesses,
  spaces,
  currentUserId
}:{
  businesses:Business[];
  spaces:ReviewSpace[];
  currentUserId:string;
}){
  const router=useRouter();
  const [busyId,setBusyId]=useState<string|null>(null);
  const [messages,setMessages]=useState<Record<string,string>>({});
  const [forms,setForms]=useState<Record<string,{
    ownership:boolean;
    location:boolean;
    spaceId:string;
    note:string;
  }>>(()=>Object.fromEntries(
    businesses.map((business)=>[
      business.id,
      {ownership:false,location:false,spaceId:"",note:""}
    ])
  ));

  function update(
    businessId:string,
    patch:Partial<{ownership:boolean;location:boolean;spaceId:string;note:string}>
  ){
    setForms((current)=>({
      ...current,
      [businessId]:{...current[businessId],...patch}
    }));
  }

  async function review(business:Business,action:"approve"|"request_changes"){
    const form=forms[business.id];
    setBusyId(business.id);
    setMessages((current)=>({...current,[business.id]:"Procesando…"}));

    try{
      const supabase=createClient();
      const {error}=await supabase.rpc("review_merchant_business",{
        p_business_id:business.id,
        p_action:action,
        p_note:form.note || undefined,
        p_ownership_verified:action==="approve" ? form.ownership : false,
        p_location_verified:action==="approve" ? form.location : false,
        p_space_id:action==="approve" && form.spaceId ? form.spaceId : undefined
      });

      if(error) throw error;

      setMessages((current)=>({
        ...current,
        [business.id]:action==="approve"
          ? "Comercio aprobado y activado."
          : "Cambios solicitados. El comercio volvió a borrador."
      }));
      router.refresh();
    }catch(error){
      setMessages((current)=>({
        ...current,
        [business.id]:error instanceof Error ? error.message : "No se pudo completar la revisión."
      }));
    }finally{
      setBusyId(null);
    }
  }

  if(businesses.length===0){
    return (
      <section className="commerce-review-empty">
        <p className="eyebrow">REVIEW QUEUE</p>
        <h2>No hay comercios pendientes.</h2>
        <p>Cuando un merchant envíe un comercio a revisión, aparecerá aquí.</p>
      </section>
    );
  }

  return (
    <section className="commerce-review-list">
      {businesses.map((business)=>{
        const form=forms[business.id];
        const selfCreated=business.created_by===currentUserId;
        const canApprove=
          !selfCreated &&
          form.ownership &&
          form.location &&
          Boolean(form.spaceId);

        return (
          <article className="commerce-review-card" key={business.id}>
            <div className="commerce-review-card-head">
              <div>
                <span className="commerce-demo-badge">PENDING REVIEW</span>
                <h2>{business.name}</h2>
                <p>{business.category} · {business.slug}</p>
              </div>
              <span className="merchant-verification-badge pending">pending</span>
            </div>

            <div className="commerce-review-summary">
              <div><span>Descripción</span><strong>{business.description || "—"}</strong></div>
              <div><span>Teléfono</span><strong>{business.phone || "—"}</strong></div>
              <div><span>Sitio web</span><strong>{business.website || "—"}</strong></div>
            </div>

            {selfCreated && (
              <div className="review-warning">
                No puedes aprobar un comercio creado por tu propia cuenta.
              </div>
            )}

            <div className="review-checks">
              <label>
                <input
                  type="checkbox"
                  checked={form.ownership}
                  onChange={(e)=>update(business.id,{ownership:e.target.checked})}
                />
                Titularidad verificada
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.location}
                  onChange={(e)=>update(business.id,{location:e.target.checked})}
                />
                Ubicación verificada
              </label>
            </div>

            <label className="review-space-select">
              Espacio verificado
              <select
                value={form.spaceId}
                onChange={(e)=>update(business.id,{spaceId:e.target.value})}
              >
                <option value="">Selecciona un espacio real…</option>
                {spaces.map((space)=>(
                  <option key={space.id} value={space.id}>{space.label}</option>
                ))}
              </select>
            </label>

            <label className="review-note">
              Nota de revisión
              <textarea
                rows={3}
                value={form.note}
                onChange={(e)=>update(business.id,{note:e.target.value})}
                placeholder="Observaciones para el merchant…"
              />
            </label>

            <div className="commerce-review-actions">
              <button
                type="button"
                onClick={()=>review(business,"request_changes")}
                disabled={busyId===business.id}
              >
                Solicitar cambios
              </button>

              <button
                type="button"
                onClick={()=>review(business,"approve")}
                disabled={!canApprove || busyId===business.id}
              >
                Activar comercio
              </button>

              {messages[business.id] && (
                <span role="status">{messages[business.id]}</span>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
