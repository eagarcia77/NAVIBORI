"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type StatusRow=Database["public"]["Functions"]["get_customer_business_request_status"]["Returns"][number];

function label(status:string){
  if(status==="new") return "Recibida";
  if(status==="accepted") return "Aceptada";
  if(status==="preparing") return "En preparación";
  if(status==="ready") return "Lista";
  if(status==="completed") return "Completada";
  if(status==="cancelled") return "Cancelada";
  if(status==="no_show") return "No-show";
  return status;
}

function dateTime(value:string|null){
  if(!value) return "—";
  return new Intl.DateTimeFormat("es-PR",{
    dateStyle:"medium",
    timeStyle:"short",
    timeZone:"America/Puerto_Rico"
  }).format(new Date(value));
}

export default function CustomerRequestManager({
  requestId
}:{
  requestId:string;
}){
  const [token,setToken]=useState("");
  const [request,setRequest]=useState<StatusRow|null>(null);
  const [status,setStatus]=useState("Verificando enlace de gestión…");
  const [busy,setBusy]=useState(false);

  const valid=useMemo(
    ()=>/^[0-9a-f]{64}$/.test(token) && /^[0-9a-f-]{36}$/i.test(requestId),
    [requestId,token]
  );

  useEffect(()=>{
    const params=new URLSearchParams(window.location.hash.slice(1));
    const value=params.get("token") ?? "";
    setToken(value);
    setStatus(
      value
        ? "Consultando el estado de tu solicitud…"
        : "El enlace de gestión está incompleto."
    );
  },[]);

  useEffect(()=>{
    if(!valid) return;
    let active=true;

    async function load(){
      try{
        const supabase=createClient();
        const {data,error}=await supabase.rpc("get_customer_business_request_status",{
          p_request_id:requestId,
          p_cancel_token:token
        });

        if(error) throw error;
        if(!active) return;

        const row=(data ?? [])[0] ?? null;
        setRequest(row);
        setStatus(
          row
            ? "Estado actualizado automáticamente."
            : "No se encontró una solicitud válida para este enlace."
        );
      }catch(error){
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudo consultar la solicitud.");
        }
      }
    }

    load();
    const timer=window.setInterval(load,15000);
    return ()=>{
      active=false;
      window.clearInterval(timer);
    };
  },[requestId,token,valid]);

  async function cancel(){
    if(!valid || !request || !["new","accepted"].includes(request.status)) return;

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
          : "No se pudo cancelar. La solicitud puede haber avanzado o ya estar cerrada."
      );

      if(data){
        const {data:refresh}=await supabase.rpc("get_customer_business_request_status",{
          p_request_id:requestId,
          p_cancel_token:token
        });
        setRequest((refresh ?? [])[0] ?? null);
      }
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo cancelar la solicitud.");
    }finally{
      setBusy(false);
    }
  }

  const cancellable=Boolean(request && ["new","accepted"].includes(request.status));
  const stages=["new","accepted","preparing","ready","completed"];
  const currentIndex=request ? stages.indexOf(request.status) : -1;

  return (
    <section className="customer-request-manager">
      <p className="eyebrow">CUSTOMER REQUEST</p>
      <h1>Gestionar solicitud</h1>
      <p>
        Referencia <strong>{requestId.slice(0,8)}</strong>. NAVIBORI no muestra aquí tus datos personales.
      </p>

      {request && (
        <>
          <div className="customer-request-status-card">
            <div>
              <span>Comercio</span>
              <strong>{request.business_name}</strong>
            </div>
            <div>
              <span>Estado</span>
              <strong className={"request-status "+request.status}>{label(request.status)}</strong>
            </div>
            <div>
              <span>Fecha solicitada</span>
              <strong>{dateTime(request.requested_for)}</strong>
            </div>
            <div>
              <span>Estimado</span>
              <strong>{dateTime(request.estimated_ready_at)}</strong>
            </div>
          </div>

          {!["cancelled","no_show"].includes(request.status) && (
            <div className="customer-request-progress" aria-label="Progreso de la solicitud">
              {stages.map((stage,index)=>(
                <div
                  key={stage}
                  className={
                    "customer-request-step "+
                    (index<=currentIndex ? "done " : "")+
                    (stage===request.status ? "current" : "")
                  }
                >
                  <span>{index+1}</span>
                  <small>{label(stage)}</small>
                </div>
              ))}
            </div>
          )}

          {request.status==="preparing" && (
            <div className="customer-request-notice">
              Tu solicitud está en preparación.
              {request.estimated_ready_at && " Hora estimada: "+dateTime(request.estimated_ready_at)+"."}
            </div>
          )}

          {request.status==="ready" && (
            <div className="customer-request-notice ready">
              Tu solicitud está lista para recoger o atender.
            </div>
          )}
        </>
      )}

      <div className="customer-request-manager-card">
        <p role="status">{status}</p>
        <button
          type="button"
          onClick={cancel}
          disabled={!valid || busy || !cancellable}
        >
          {busy ? "Cancelando…" : "Cancelar solicitud"}
        </button>

        {request && !cancellable && !["cancelled","completed","no_show"].includes(request.status) && (
          <small>La solicitud ya está en proceso. Contacta directamente al comercio si necesitas un cambio.</small>
        )}
      </div>

      <small>
        El enlace contiene un token secreto. No lo publiques ni lo compartas con terceros.
      </small>
    </section>
  );
}
