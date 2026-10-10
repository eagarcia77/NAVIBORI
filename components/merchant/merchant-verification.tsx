"use client";

import { useEffect, useState } from "react";
import { assessMerchantVerification } from "@/lib/commerce/verification";

type Draft={
  name?:string;
  description?:string;
  phone?:string;
  whatsapp?:string;
  website?:string;
  opens?:string;
  closes?:string;
};

export default function MerchantVerification(){
  const [draft,setDraft]=useState<Draft>({});
  const [catalogCount,setCatalogCount]=useState(0);

  function refresh(){
    try{
      setDraft(JSON.parse(localStorage.getItem("navibori:merchant-draft") ?? "{}"));
      const catalog=JSON.parse(localStorage.getItem("navibori:merchant-catalog") ?? "[]");
      setCatalogCount(Array.isArray(catalog)?catalog.length:0);
    }catch{
      setDraft({});
      setCatalogCount(0);
    }
  }

  useEffect(()=>{
    refresh();
    window.addEventListener("navibori:merchant-draft-updated",refresh);
    window.addEventListener("navibori:merchant-catalog-updated",refresh);
    return ()=>{
      window.removeEventListener("navibori:merchant-draft-updated",refresh);
      window.removeEventListener("navibori:merchant-catalog-updated",refresh);
    };
  },[]);

  const state=assessMerchantVerification({
    name:Boolean(draft.name?.trim()),
    description:Boolean(draft.description?.trim()),
    contact:Boolean(draft.phone?.trim() || draft.whatsapp?.trim() || draft.website?.trim()),
    hours:Boolean(draft.opens && draft.closes),
    catalog:catalogCount>0,
    locationVerified:false,
    ownerMembershipVerified:false
  });

  return (
    <section className="merchant-verification">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">MERCHANT VERIFICATION</p>
          <h2>{state.verified ? "Verificado" : state.readyForReview ? "Listo para revisión" : "Perfil incompleto"}</h2>
        </div>
        <strong>{state.completed}/{state.total}</strong>
      </div>
      <div className="merchant-verification-bar" aria-hidden="true">
        <span style={{width:((state.completed/state.total)*100)+"%"}} />
      </div>
      <p>
        {state.missing.length
          ? "Pendiente: " + state.missing.join(", ") + "."
          : "Todos los requisitos están completos."}
      </p>
      <small>
        Ubicación y titularidad solo podrán marcarse como verificadas mediante el flujo oficial del venue.
      </small>
    </section>
  );
}
