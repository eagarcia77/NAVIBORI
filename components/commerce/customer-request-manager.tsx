"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RequestStatusRow={
  id:string;
  business_id:string;
  business_name:string;
  status:string;
  fulfillment_method:string;
  requested_for:string|null;
  timezone:string;
  max_advance_days:number;
  estimated_ready_at:string|null;
  preparation_started_at:string|null;
  ready_at:string|null;
  updated_at:string;
  customer_cancelled_at:string|null;
};

type FulfillmentSlot={
  slot_start:string;
  capacity:number;
  active_count:number;
  available:boolean;
};

function dateInTimeZone(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone,
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).formatToParts(date);

  const get=(type:string)=>parts.find((part)=>part.type===type)?.value ?? "";
  return get("year")+"-"+get("month")+"-"+get("day");
}

function addDays(value:string,days:number){
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}

function requestStatusLabel(status:string){
  if(status==="new") return "Recibida";
  if(status==="accepted") return "Aceptada";
  if(status==="preparing") return "En preparación";
  if(status==="ready") return "Lista";
  if(status==="completed") return "Completada";
  if(status==="cancelled") return "Cancelada";
  if(status==="no_show") return "No-show";
  return status;
}

export default function CustomerRequestManager({
  requestId
}:{
  requestId:string;
}){
  const [token,setToken]=useState("");
  const [request,setRequest]=useState<RequestStatusRow|null>(null);
  const [status,setStatus]=useState("Verificando enlace de gestión…");
  const [requestedDate,setRequestedDate]=useState("");
  const [requestedFor,setRequestedFor]=useState("");
  const [slots,setSlots]=useState<FulfillmentSlot[]>([]);
  const [slotStatus,setSlotStatus]=useState("");
  const [busy,setBusy]=useState(false);

  const valid=useMemo(
    ()=>/^[0-9a-f]{64}$/.test(token) && /^[0-9a-f-]{36}$/i.test(requestId),
    [requestId,token]
  );

  const canReschedule=Boolean(
    request &&
    ["new","accepted"].includes(request.status) &&
    ["pickup","reservation"].includes(request.fulfillment_method)
  );

  const canCancel=Boolean(
    request && ["new","accepted"].includes(request.status)
  );

  const today=useMemo(
    ()=>request ? dateInTimeZone(new Date(),request.timezone) : "",
    [request]
  );

  const maxDate=useMemo(
    ()=>request && today
      ? addDays(today,request.max_advance_days)
      : "",
    [request,today]
  );

  async function loadRequest(active=true){
    if(!valid) return;

    const supabase=createClient();
    const {data,error}=await supabase.rpc("get_customer_business_request_status",{
      p_request_id:requestId,
      p_cancel_token:token
    });

    if(error) throw error;
    if(!active) return;

    const row=(data?.[0] ?? null) as RequestStatusRow|null;
    setRequest(row);

    if(!row){
      setStatus("No se pudo verificar esta solicitud. El enlace puede ser inválido o haber expirado.");
      return;
    }

    setStatus(
      ["completed","cancelled","no_show"].includes(row.status)
        ? "Esta solicitud está cerrada."
        : ["preparing","ready"].includes(row.status)
          ? "La solicitud ya está en preparación y no puede reprogramarse desde este enlace."
          : "Puedes cancelar o reprogramar esta solicitud."
    );
  }

  useEffect(()=>{
    const params=new URLSearchParams(window.location.hash.slice(1));
    const value=params.get("token") ?? "";
    setToken(value);

    if(!value){
      setStatus("El enlace de gestión está incompleto.");
    }
  },[]);

  useEffect(()=>{
    if(!valid) return;
    let active=true;

    const refresh=()=>{
      loadRequest(active).catch((error)=>{
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudo verificar la solicitud.");
        }
      });
    };

    refresh();
    const timer=window.setInterval(refresh,15000);

    return ()=>{
      active=false;
      window.clearInterval(timer);
    };
  },[valid]);

  useEffect(()=>{
    let active=true;

    if(!request || !canReschedule || !requestedDate){
      setSlots([]);
      setRequestedFor("");
      setSlotStatus("");
      return ()=>{active=false};
    }

    setRequestedFor("");
    setSlotStatus("Consultando disponibilidad…");

    const supabase=createClient();
    supabase
      .rpc("get_business_fulfillment_slots",{
        p_business_id:request.business_id,
        p_fulfillment_method:request.fulfillment_method,
        p_local_date:requestedDate
      })
      .then(({data,error})=>{
        if(!active) return;

        if(error){
          setSlots([]);
          setSlotStatus(error.message);
          return;
        }

        const next=(data ?? []) as FulfillmentSlot[];
        setSlots(next);
        setSlotStatus(
          next.some((slot)=>slot.available)
            ? "Selecciona un horario disponible."
            : "No hay espacios disponibles para esta fecha."
        );
      });

    return ()=>{active=false};
  },[request,canReschedule,requestedDate]);

  function formatDateTime(value:string|null){
    if(!value || !request) return "Sin horario";
    return new Intl.DateTimeFormat("es-PR",{
      timeZone:request.timezone,
      dateStyle:"medium",
      timeStyle:"short"
    }).format(new Date(value));
  }

  function formatSlot(value:string){
    if(!request) return "";
    return new Intl.DateTimeFormat("es-PR",{
      timeZone:request.timezone,
      hour:"numeric",
      minute:"2-digit"
    }).format(new Date(value));
  }

  async function reschedule(){
    if(!valid || !canReschedule || !requestedFor) return;

    const confirmed=window.confirm(
      "¿Deseas cambiar esta solicitud al nuevo horario? Si ya estaba aceptada, volverá a pendiente de confirmación."
    );
    if(!confirmed) return;

    setBusy(true);
    setStatus("Reprogramando solicitud…");

    try{
      const supabase=createClient();
      const {data,error}=await supabase.rpc("reschedule_business_customer_request",{
        p_request_id:requestId,
        p_cancel_token:token,
        p_requested_for:requestedFor
      });

      if(error) throw error;

      if(!data){
        setStatus("No se pudo reprogramar. El slot puede haberse llenado o dejado de estar disponible.");
        return;
      }

      setRequestedDate("");
      setRequestedFor("");
      setSlots([]);
      await loadRequest();
      setStatus("Solicitud reprogramada. El comercio deberá confirmar el nuevo horario.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo reprogramar la solicitud.");
    }finally{
      setBusy(false);
    }
  }

  async function cancel(){
    if(!valid || !canCancel) return;

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

      if(!data){
        setStatus("No se pudo cancelar. La solicitud puede estar cerrada o en preparación.");
        return;
      }

      await loadRequest();
      setStatus("Solicitud cancelada. El espacio reservado fue liberado.");
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

      {request && (
        <div className="customer-request-summary">
          <div>
            <span>Comercio</span>
            <strong>{request.business_name}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong className={"request-status "+request.status}>
              {requestStatusLabel(request.status)}
            </strong>
          </div>
          <div>
            <span>Modalidad</span>
            <strong>
              {request.fulfillment_method==="pickup"
                ? "Pickup / recogido"
                : request.fulfillment_method==="reservation"
                  ? "Reservación / cita"
                  : "Contacto"}
            </strong>
          </div>
          <div>
            <span>Horario actual</span>
            <strong>{formatDateTime(request.requested_for)}</strong>
          </div>
        </div>

        {!["cancelled","no_show"].includes(request.status) && (
          <div className="customer-request-progress" aria-label="Progreso de la solicitud">
            {["new","accepted","preparing","ready","completed"].map((stage,index,stages)=>{
              const currentIndex=stages.indexOf(request.status);
              return (
                <div
                  key={stage}
                  className={
                    "customer-request-step "+
                    (index<=currentIndex ? "done " : "")+
                    (stage===request.status ? "current" : "")
                  }
                >
                  <span>{index+1}</span>
                  <small>{requestStatusLabel(stage)}</small>
                </div>
              );
            })}
          </div>
        )}

        {(request.estimated_ready_at || request.status==="preparing" || request.status==="ready") && (
          <div className={"customer-request-notice "+(request.status==="ready" ? "ready" : "")}>
            {request.status==="ready"
              ? "Tu solicitud está lista para recoger o atender."
              : request.status==="preparing"
                ? "Tu solicitud está en preparación."
                : "El comercio actualizó el tiempo estimado."}
            {request.estimated_ready_at && (
              <> Estimado: <strong>{formatDateTime(request.estimated_ready_at)}</strong>.</>
            )}
          </div>
        )}
      )}

      <div className="customer-request-manager-card">
        <p role="status">{status}</p>

        {canReschedule && request && (
          <div className="customer-reschedule-grid">
            <label>
              Nueva fecha
              <input
                type="date"
                min={today}
                max={maxDate}
                value={requestedDate}
                disabled={busy}
                onChange={(event)=>setRequestedDate(event.target.value)}
              />
            </label>

            <label>
              Nuevo horario
              <select
                value={requestedFor}
                disabled={busy || !requestedDate || slots.length===0}
                onChange={(event)=>setRequestedFor(event.target.value)}
              >
                <option value="">Selecciona un horario</option>
                {slots.map((slot)=>{
                  const remaining=Math.max(0,slot.capacity-slot.active_count);
                  return (
                    <option
                      key={slot.slot_start}
                      value={slot.slot_start}
                      disabled={!slot.available}
                    >
                      {formatSlot(slot.slot_start)}
                      {" · "}
                      {slot.available
                        ? remaining+" "+(remaining===1 ? "espacio disponible" : "espacios disponibles")
                        : "No disponible"}
                    </option>
                  );
                })}
              </select>
              {slotStatus && <small>{slotStatus}</small>}
            </label>

            <button
              type="button"
              onClick={reschedule}
              disabled={busy || !requestedFor}
            >
              {busy ? "Procesando…" : "Reprogramar"}
            </button>
          </div>
        )}

        <button
          type="button"
          className="customer-cancel-request"
          onClick={cancel}
          disabled={!canCancel || busy}
        >
          {busy ? "Procesando…" : "Cancelar solicitud"}
        </button>
      </div>

      <small>
        El enlace contiene un token secreto. No lo publiques ni lo compartas con terceros.
      </small>
    </section>
  );
}
