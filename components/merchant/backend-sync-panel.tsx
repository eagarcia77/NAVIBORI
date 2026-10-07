"use client";

import { useEffect, useState } from "react";
import {
  resolveMerchantBackendContext,
  saveMerchantDraftToBackend,
  submitMerchantBusinessForReview,
  syncLocalMerchantContent,
  type MerchantBackendContext
} from "@/lib/commerce/backend-sync";

type Draft={
  name:string;
  category:string;
  description:string;
  phone:string;
  website:string;
};

export default function BackendSyncPanel(){
  const [context,setContext]=useState<MerchantBackendContext>({mode:"anonymous"});
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [status,setStatus]=useState("Verificando acceso…");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let active=true;
    resolveMerchantBackendContext()
      .then((next)=>{
        if(!active) return;
        setContext(next);
        setBusinessId(localStorage.getItem("navibori:merchant-business-id"));
        setStatus(
          next.mode==="authorized"
            ? "Supabase listo · "+next.role
            : next.mode==="no-role"
              ? "Sesión activa sin rol merchant"
              : "Sin sesión · modo local"
        );
      })
      .catch((error)=>{
        if(active) setStatus("Backend no disponible: "+error.message);
      });
    return ()=>{active=false};
  },[]);

  async function sync(){
    setBusy(true);
    try{
      const raw=localStorage.getItem("navibori:merchant-draft");
      if(!raw){
        throw new Error("Guarda primero el perfil del comercio.");
      }

      const draft:Draft=JSON.parse(raw);
      const saved=await saveMerchantDraftToBackend(draft);

      if(saved.context.mode!=="authorized" || !saved.businessId){
        setStatus(
          saved.context.mode==="no-role"
            ? "Tu cuenta no tiene todavía un rol merchant asignado a un venue."
            : "Inicia sesión para sincronizar con Supabase."
        );
        return;
      }

      await syncLocalMerchantContent(saved.businessId);
      setBusinessId(saved.businessId);
      setStatus("Borrador sincronizado con Supabase.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo sincronizar.");
    }finally{
      setBusy(false);
    }
  }

  async function submit(){
    if(!businessId) return;
    setBusy(true);
    try{
      await submitMerchantBusinessForReview(businessId);
      setStatus("Comercio enviado a revisión. Un administrador debe verificar ubicación y titularidad.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo enviar a revisión.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="merchant-backend-sync">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">BACKEND SYNC</p>
          <h2>Supabase + RLS</h2>
        </div>
        <span className={"backend-mode "+context.mode}>{context.mode}</span>
      </div>

      <p role="status">{status}</p>

      <div className="merchant-actions">
        <button type="button" onClick={sync} disabled={busy || context.mode!=="authorized"}>
          {busy?"Procesando…":"Sincronizar borrador"}
        </button>
        <button type="button" onClick={submit} disabled={busy || !businessId}>
          Enviar a revisión
        </button>
      </div>

      <small>
        La seguridad la aplica Supabase RLS. Un merchant solo puede editar su propio comercio en estado draft.
      </small>
    </section>
  );
}
