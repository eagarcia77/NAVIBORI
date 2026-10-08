"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CustomerRequestManager({
  requestId
}:{
  requestId:string;
}){
  const [token,setToken]=useState("");
  const [status,setStatus]=useState("Verificando enlace de gestión…");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.hash.slice(1));
    const value=params.get("token") ?? "";
    setToken(value);
    setStatus(
      value
        ? "Este enlace permite cancelar la solicitud asociada."
        : "El enlace de gestión está incompleto."
    );
  },[]);

  const valid=useMemo(
    ()=>/^[0-9a-f]{64}$/.test(token) && /^[0-9a-f-]{36}$/i.test(requestId),
    [requestId,token]
  );

  async function cancel(){
    if(!valid) return;

    const confirmed=window.confirm(
      "¿Deseas cancelar esta solicitud? Esta acción no se puede revertir desde este enlace."
    );
    if(!confirmed) return;

    setBusy(true);
    setStatus("Cancelando solicitud…");

    try{
      const supabase=createClient();
      const {data,error}=await supabase.rpc("cancel_business_customer_request",{
        p_request_id:requestId,
        p_cancel_token:token
      });

      if(error) throw error;

      setStatus(
        data
          ? "Solicitud cancelada. El espacio reservado fue liberado."
          : "No se pudo cancelar. El enlace puede ser inválido o la solicitud ya está cerrada."
      );
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo cancelar la solicitud.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="customer-request-manager">
      <p className="eyebrow">CUSTOMER REQUEST</p>
      <h1>Gestionar solicitud</h1>
      <p>
        Referencia <strong>{requestId.slice(0,8)}</strong>. NAVIBORI no muestra aquí tus datos personales.
      </p>

      <div className="customer-request-manager-card">
        <p role="status">{status}</p>
        <button
          type="button"
          onClick={cancel}
          disabled={!valid || busy}
        >
          {busy ? "Cancelando…" : "Cancelar solicitud"}
        </button>
      </div>

      <small>
        El enlace contiene un token secreto. No lo publiques ni lo compartas con terceros.
      </small>
    </section>
  );
}
