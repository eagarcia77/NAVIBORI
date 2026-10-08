"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import type { Database } from "@/lib/supabase/database.types";

type RequestRow=Database["public"]["Tables"]["business_customer_requests"]["Row"];
type SettingsRow=Database["public"]["Tables"]["business_service_settings"]["Row"];
type FulfillmentMethod="pickup"|"reservation";
type SlotRow={
  slot_start:string;
  capacity:number;
  active_count:number;
  available:boolean;
};
type OperationalSlot=SlotRow&{method:FulfillmentMethod};

function dateInTimeZone(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-CA",{
    timeZone,
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).formatToParts(date);

  const get=(type:string)=>parts.find((part)=>part.type===type)?.value ?? "";
  return get("year")+"-"+get("month")+"-"+get("day");
}

function shiftIsoDate(value:string,days:number){
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}

function formatDayLabel(value:string){
  const [year,month,day]=value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PR",{
    weekday:"long",
    month:"long",
    day:"numeric"
  }).format(new Date(Date.UTC(year,month-1,day,12)));
}

function formatTime(value:string,timeZone:string){
  return new Intl.DateTimeFormat("es-PR",{
    timeZone,
    hour:"numeric",
    minute:"2-digit"
  }).format(new Date(value));
}

function sameLocalDate(value:string|null,date:string,timeZone:string){
  if(!value) return false;
  return dateInTimeZone(new Date(value),timeZone)===date;
}

function methodLabel(method:string){
  if(method==="pickup") return "Pickup";
  if(method==="reservation") return "Reservación";
  return "Contacto";
}

function statusLabel(status:string){
  if(status==="new") return "Nueva";
  if(status==="accepted") return "Aceptada";
  if(status==="preparing") return "En preparación";
  if(status==="ready") return "Lista";
  if(status==="completed") return "Completada";
  if(status==="cancelled") return "Cancelada";
  if(status==="no_show") return "No-show";
  return status;
}

export default function MerchantFulfillmentBoard(){
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [businessName,setBusinessName]=useState("");
  const [settings,setSettings]=useState<SettingsRow|null>(null);
  const [selectedDate,setSelectedDate]=useState(
    ()=>dateInTimeZone(new Date(),"America/Puerto_Rico")
  );
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [slots,setSlots]=useState<OperationalSlot[]>([]);
  const [status,setStatus]=useState("Cargando agenda operativa…");
  const [busyId,setBusyId]=useState<string|null>(null);
  const [live,setLive]=useState(false);

  const timeZone=settings?.timezone ?? "America/Puerto_Rico";
  const today=useMemo(()=>dateInTimeZone(new Date(),timeZone),[timeZone]);

  useEffect(()=>{
    let active=true;

    getOwnedMerchantBusiness()
      .then(async(business)=>{
        if(!active) return;
        if(!business){
          setStatus("Conecta primero un comercio para activar la agenda operativa.");
          return;
        }

        setBusinessId(business.id);
        setBusinessName(business.name);

        const supabase=createClient();
        const {data,error}=await supabase
          .from("business_service_settings")
          .select("*")
          .eq("business_id",business.id)
          .maybeSingle();

        if(error) throw error;
        if(!active) return;

        setSettings(data);
        if(data?.timezone){
          setSelectedDate(dateInTimeZone(new Date(),data.timezone));
        }
      })
      .catch((error)=>{
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudo cargar la agenda.");
        }
      });

    return ()=>{active=false};
  },[]);

  const loadDay=useCallback(async()=>{
    if(!businessId){
      return;
    }

    setStatus("Actualizando agenda de "+formatDayLabel(selectedDate)+"…");
    const supabase=createClient();

    const {data:requestRows,error:requestError}=await supabase
      .from("business_customer_requests")
      .select("*")
      .eq("business_id",businessId)
      .not("requested_for","is",null)
      .order("requested_for",{ascending:true})
      .limit(500);

    if(requestError) throw requestError;

    const dayRequests=(requestRows ?? []).filter((request)=>
      sameLocalDate(request.requested_for,selectedDate,timeZone)
    );

    const methods:FulfillmentMethod[]=[];
    if(settings?.accepts_pickup) methods.push("pickup");
    if(settings?.accepts_reservations) methods.push("reservation");

    const slotResponses=await Promise.all(
      methods.map(async(method)=>{
        const {data,error}=await supabase.rpc("get_business_fulfillment_slots",{
          p_business_id:businessId,
          p_fulfillment_method:method,
          p_local_date:selectedDate
        });
        if(error) throw error;
        return (data ?? []).map((slot)=>({...slot,method}));
      })
    );

    setRequests(dayRequests);
    setSlots(slotResponses.flat());
    setStatus(
      dayRequests.length
        ? dayRequests.length+" solicitud(es) programada(s) para "+formatDayLabel(selectedDate)+"."
        : "No hay solicitudes programadas para "+formatDayLabel(selectedDate)+"."
    );
  },[
    businessId,
    selectedDate,
    settings?.accepts_pickup,
    settings?.accepts_reservations,
    timeZone
  ]);

  useEffect(()=>{
    if(!businessId) return;
    let active=true;

    loadDay().catch((error)=>{
      if(active){
        setStatus(error instanceof Error ? error.message : "No se pudo actualizar la agenda.");
      }
    });

    const supabase=createClient();
    const channel=supabase
      .channel("merchant-operations:"+businessId+":"+selectedDate)
      .on(
        "postgres_changes",
        {
          event:"*",
          schema:"public",
          table:"business_customer_requests",
          filter:"business_id=eq."+businessId
        },
        ()=>{
          if(active){
            loadDay().catch(()=>{});
          }
        }
      )
      .subscribe((channelStatus)=>{
        if(active) setLive(channelStatus==="SUBSCRIBED");
      });

    return ()=>{
      active=false;
      setLive(false);
      supabase.removeChannel(channel);
    };
  },[businessId,selectedDate,loadDay]);

  const summary=useMemo(()=>{
    const newCount=requests.filter((request)=>request.status==="new").length;
    const accepted=requests.filter((request)=>request.status==="accepted").length;
    const preparing=requests.filter((request)=>request.status==="preparing").length;
    const ready=requests.filter((request)=>request.status==="ready").length;
    const completed=requests.filter((request)=>request.status==="completed").length;
    const noShow=requests.filter((request)=>request.status==="no_show").length;
    const activeSlots=slots.reduce((sum,slot)=>sum+slot.active_count,0);
    const capacity=slots.reduce((sum,slot)=>sum+slot.capacity,0);
    const utilization=capacity ? Math.round(activeSlots/capacity*100) : 0;

    return {
      newCount,
      accepted,
      preparing,
      ready,
      completed,
      noShow,
      scheduled:requests.length,
      utilization
    };
  },[requests,slots]);

  const groupedSlots=useMemo(()=>{
    return {
      pickup:slots.filter((slot)=>slot.method==="pickup"),
      reservation:slots.filter((slot)=>slot.method==="reservation")
    };
  },[slots]);

  async function updateRequest(
    requestId:string,
    next:"accepted"|"preparing"|"ready"|"completed"|"cancelled"|"no_show"
  ){
    setBusyId(requestId);

    try{
      const supabase=createClient();
      const {error}=await supabase.rpc("update_business_customer_request_status",{
        p_request_id:requestId,
        p_status:next
      });

      if(error) throw error;
      await loadDay();
    }catch(error){
      setStatus(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la solicitud."
      );
    }finally{
      setBusyId(null);
    }
  }

  async function setEstimate(requestId:string,minutes:number){
    setBusyId(requestId);

    try{
      const supabase=createClient();
      const estimated=new Date(Date.now()+minutes*60_000).toISOString();
      const {error}=await supabase.rpc("set_business_customer_request_estimate",{
        p_request_id:requestId,
        p_estimated_ready_at:estimated
      });

      if(error) throw error;
      setStatus("Tiempo estimado actualizado.");
      await loadDay();
    }catch(error){
      setStatus(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el tiempo estimado."
      );
    }finally{
      setBusyId(null);
    }
  }

  function contactHref(request:RequestRow){
    if(request.contact_method==="email"){
      return "mailto:"+request.contact_value;
    }
    if(request.contact_method==="whatsapp"){
      return "https://wa.me/"+request.contact_value.replace(/\D/g,"");
    }
    return "tel:"+request.contact_value;
  }

  function jumpToday(){
    setSelectedDate(today);
  }

  const isToday=selectedDate===today;

  return (
    <section className="merchant-operations-board">
      <div className="merchant-section-head merchant-operations-head">
        <div>
          <p className="eyebrow">TODAY OPS</p>
          <h2>Agenda operativa</h2>
          <small>
            {businessName
              ? "Pickup y reservaciones de "+businessName+" por horario y capacidad."
              : "Pickup y reservaciones por horario y capacidad."}
          </small>
        </div>

        <div className="merchant-operations-live">
          <span className={"realtime-badge "+(live?"live":"offline")}>
            {live ? "LIVE" : "SYNC"}
          </span>
          <span>{formatDayLabel(selectedDate)}</span>
        </div>
      </div>

      <div className="merchant-operations-datebar">
        <button
          type="button"
          aria-label="Día anterior"
          onClick={()=>setSelectedDate((current)=>shiftIsoDate(current,-1))}
        >
          ←
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(event)=>setSelectedDate(event.target.value)}
        />
        <button
          type="button"
          aria-label="Día siguiente"
          onClick={()=>setSelectedDate((current)=>shiftIsoDate(current,1))}
        >
          →
        </button>
        <button type="button" onClick={jumpToday} disabled={isToday}>
          Hoy
        </button>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="merchant-operations-summary">
        <article>
          <span>Programadas</span>
          <strong>{summary.scheduled}</strong>
        </article>
        <article>
          <span>Nuevas</span>
          <strong>{summary.newCount}</strong>
        </article>
        <article>
          <span>Aceptadas</span>
          <strong>{summary.accepted}</strong>
        </article>
        <article>
          <span>Preparación</span>
          <strong>{summary.preparing}</strong>
        </article>
        <article>
          <span>Listas</span>
          <strong>{summary.ready}</strong>
        </article>
        <article>
          <span>Completadas</span>
          <strong>{summary.completed}</strong>
        </article>
        <article>
          <span>No-show</span>
          <strong>{summary.noShow}</strong>
        </article>
        <article>
          <span>Carga del día</span>
          <strong>{summary.utilization}%</strong>
        </article>
      </div>

      <div className="merchant-capacity-board">
        {(["pickup","reservation"] as FulfillmentMethod[]).map((method)=>{
          const methodSlots=groupedSlots[method];
          const enabled=
            method==="pickup"
              ? Boolean(settings?.accepts_pickup)
              : Boolean(settings?.accepts_reservations);

          if(!enabled) return null;

          return (
            <article key={method}>
              <div className="merchant-capacity-head">
                <div>
                  <span>{methodLabel(method)}</span>
                  <strong>
                    {methodSlots.reduce((sum,slot)=>sum+slot.active_count,0)}
                    {" / "}
                    {methodSlots.reduce((sum,slot)=>sum+slot.capacity,0)}
                  </strong>
                </div>
                <small>{methodSlots.length} slots</small>
              </div>

              <div className="merchant-capacity-slots">
                {methodSlots.length===0 && (
                  <div className="merchant-capacity-empty">
                    Sin horarios publicados para este día.
                  </div>
                )}

                {methodSlots.map((slot)=>{
                  const pct=slot.capacity
                    ? Math.min(100,Math.round(slot.active_count/slot.capacity*100))
                    : 0;

                  return (
                    <div
                      key={method+":"+slot.slot_start}
                      className={"merchant-capacity-slot "+(!slot.available?"full":"")}
                    >
                      <div>
                        <strong>{formatTime(slot.slot_start,timeZone)}</strong>
                        <span>{slot.active_count}/{slot.capacity}</span>
                      </div>
                      <div
                        className="merchant-capacity-track"
                        aria-label={
                          formatTime(slot.slot_start,timeZone)+
                          ": "+slot.active_count+" de "+slot.capacity
                        }
                      >
                        <span style={{width:pct+"%"}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <div className="merchant-operations-schedule">
        {requests.length===0 ? (
          <div className="merchant-operations-empty">
            <strong>Agenda libre</strong>
            <span>
              No hay pickup ni reservaciones programadas para este día.
            </span>
          </div>
        ) : (
          requests.map((request)=>(
            <article key={request.id}>
              <div className="merchant-operations-time">
                <strong>
                  {request.requested_for
                    ? formatTime(request.requested_for,timeZone)
                    : "—"}
                </strong>
                <span>{methodLabel(request.fulfillment_method)}</span>
              </div>

              <div className="merchant-operations-request">
                <div>
                  <strong>{request.customer_name}</strong>
                  <span>
                    Ref. {request.id.slice(0,8)}
                    {" · "}
                    Cant. {request.quantity}
                  </span>
                </div>
                {request.note && <p>{request.note}</p>}
                {request.estimated_ready_at && (
                  <div className="merchant-operations-eta">
                    Estimado: {formatTime(request.estimated_ready_at,timeZone)}
                  </div>
                )}
              </div>

              <div className="merchant-operations-actions">
                <span className={"request-status "+request.status}>
                  {statusLabel(request.status)}
                </span>

                <a
                  href={contactHref(request)}
                  target={request.contact_method==="whatsapp" ? "_blank" : undefined}
                  rel={request.contact_method==="whatsapp" ? "noreferrer" : undefined}
                >
                  Contactar
                </a>

                {request.status==="new" && (
                  <button
                    type="button"
                    disabled={busyId===request.id}
                    onClick={()=>updateRequest(request.id,"accepted")}
                  >
                    Aceptar
                  </button>
                )}

                {(request.status==="accepted" || request.status==="preparing") && (
                  <div className="merchant-estimate-actions" aria-label="Tiempo estimado">
                    {[15,30,45,60].map((minutes)=>(
                      <button
                        key={minutes}
                        type="button"
                        disabled={busyId===request.id}
                        onClick={()=>setEstimate(request.id,minutes)}
                      >
                        +{minutes}m
                      </button>
                    ))}
                  </div>
                )}

                {request.status==="accepted" && (
                  <button
                    type="button"
                    disabled={busyId===request.id}
                    onClick={()=>updateRequest(request.id,"preparing")}
                  >
                    Iniciar preparación
                  </button>
                )}

                {request.status==="preparing" && (
                  <button
                    type="button"
                    disabled={busyId===request.id}
                    onClick={()=>updateRequest(request.id,"ready")}
                  >
                    Marcar listo
                  </button>
                )}

                {request.status==="ready" && (
                  <button
                    type="button"
                    disabled={busyId===request.id}
                    onClick={()=>updateRequest(request.id,"completed")}
                  >
                    Completar
                  </button>
                )}

                {(request.status==="accepted" || request.status==="ready") && request.requested_for && new Date(request.requested_for)<=new Date() && (
                  <button
                    type="button"
                    disabled={busyId===request.id}
                    onClick={()=>updateRequest(request.id,"no_show")}
                  >
                    No-show
                  </button>
                )}

                {["new","accepted","preparing","ready"].includes(request.status) && (
                  <button
                    type="button"
                    className="danger"
                    disabled={busyId===request.id}
                    onClick={()=>updateRequest(request.id,"cancelled")}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <small className="merchant-operations-footnote">
        La carga utiliza los mismos slots, capacidad y bloqueos que ve el cliente.
        Las solicitudes de “contactarme” permanecen en la bandeja general.
      </small>
    </section>
  );
}
