"use client";

import { useEffect, useState } from "react";
import {validMerchantHours,merchantVerificationLabel} from "@/lib/commerce/merchant-hours";
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

export default function MerchantVerification({locationVerified=false,ownerMembershipVerified=false,published=false,pending=false}:{locationVerified?:boolean;ownerMembershipVerified?:boolean;published?:boolean;pending?:boolean}){
  const [draft,setDraft]=useState<Draft>({});
  const [hoursReady,setHoursReady]=useState(false);
  const [catalogCount,setCatalogCount]=useState(0);

  function refresh(){
    try{
      setDraft(JSON.parse(localStorage.getItem("navibori:merchant-draft") ?? "{}"));
      const catalog=JSON.parse(localStorage.getItem("navibori:merchant-catalog") ?? "[]");
      setCatalogCount(Array.isArray(catalog)?catalog.filter(item=>typeof item?.title==="string"&&item.title.trim()).length:0);
      setHoursReady(validMerchantHours(JSON.parse(localStorage.getItem("navibori:merchant-hours")??"null")));
    }catch{
      setDraft({});
      setCatalogCount(0);setHoursReady(false);
    }
  }

  useEffect(()=>{
    refresh();
    window.addEventListener("navibori:merchant-draft-updated",refresh);
    window.addEventListener("navibori:merchant-catalog-updated",refresh);
    window.addEventListener("navibori:merchant-hours-updated",refresh);
    return ()=>{
      window.removeEventListener("navibori:merchant-draft-updated",refresh);
      window.removeEventListener("navibori:merchant-catalog-updated",refresh);
      window.removeEventListener("navibori:merchant-hours-updated",refresh);
    };
  },[]);

  const state=assessMerchantVerification({
    name:Boolean(draft.name?.trim()),
    description:Boolean(draft.description?.trim()),
    contact:Boolean(draft.phone?.trim() || draft.whatsapp?.trim() || draft.website?.trim()),
    hours:hoursReady,
    catalog:catalogCount>0,
    locationVerified,
    ownerMembershipVerified
  });

  return (
    <section className="merchant-verification">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">MERCHANT VERIFICATION</p>
          <h2>{merchantVerificationLabel(published,pending,state.readyForReview)}</h2>
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
        Este indicador revisa tus borradores. Guarda los cambios en tu cuenta y solicita la revisión. La ubicación, la titularidad y la publicación requieren aprobación oficial.
      </small>
    </section>
  );
}
