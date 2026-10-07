"use client";

import { useEffect, useState } from "react";
import {
  getOwnedMerchantBusiness,
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
  const [businessStatus,setBusinessStatus]=useState<string|null>(null);
  const [verificationStatus,setVerificationStatus]=useState<string|null>(null);
  const [status,setStatus]=useState("Verificando acceso…");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let active=true;
    resolveMerchantBackendContext()
      .then(async(next)=>{
        if(!active) return;
        setContext(next);

        if(next.mode==="authorized"){
          const owned=await getOwnedMerchantBusiness(next);
          if(!active) return;

          if(owned){
            setBusinessId(owned.id);
            setBusinessStatus(owned.status);
            setVerificationStatus(owned.verificationStatus);
            localStorage.setItem("navibori:merchant-business-id",owned.id);
            setStatus(
              owned.status==="active"
                ? "Comercio publicado · operación diaria habilitada."
                : owned.verificationStatus==="pending"
                  ? "Comercio pendiente de revisión administrativa."
                  : "Borrador conectado a Supabase."
            );
          }else{
            setStatus("Supabase listo · todavía no existe un comercio para esta cuenta.");
          }
          return;
        }

        setBusinessId(localStorage.getItem("navibori:merchant-business-id"));
        setStatus(
          next.mode==="no-role"
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
      if(businessStatus==="pending" || verificationStatus==="pending"){
        throw new Error("El comercio está pendiente de revisión y no puede modificarse hasta que termine el proceso.");
      }

      if(businessStatus==="active" && businessId){
        await syncLocalMerchantContent(businessId);
        setStatus("Operación actualizada: horarios, catálogo y promociones sincronizados.");
        return;
      }

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
      setBusinessStatus(saved.businessStatus ?? "draft");
      setVerificationStatus(saved.verificationStatus ?? "unverified");
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
      setBusinessStatus("draft");
      setVerificationStatus("pending");
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
        <div className="backend-status-stack">
          <span className={"backend-mode "+context.mode}>{context.mode}</span>
          {businessStatus && <span className={"commerce-lifecycle "+businessStatus}>{businessStatus}</span>}
        </div>
      </div>

      <p role="status">{status}</p>

      <div className="merchant-actions">
        <button
          type="button"
          onClick={sync}
          disabled={busy || context.mode!=="authorized" || verificationStatus==="pending"}
        >
          {busy
            ? "Procesando…"
            : businessStatus==="active"
              ? "Actualizar operación"
              : "Sincronizar borrador"}
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            !businessId ||
            businessStatus==="active" ||
            verificationStatus==="pending"
          }
        >
          Enviar a revisión
        </button>
      </div>

      <small>
        La seguridad la aplica Supabase RLS. El perfil estructural requiere revisión; un comercio activo puede actualizar únicamente su operación diaria.
      </small>
    </section>
  );
}
