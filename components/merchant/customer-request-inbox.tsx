"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import type { Database } from "@/lib/supabase/database.types";

type RequestRow=Database["public"]["Tables"]["business_customer_requests"]["Row"];

export default function CustomerRequestInbox(){
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [offerTitles,setOfferTitles]=useState<Record<string,string>>({});
  const [status,setStatus]=useState("Cargando solicitudes…");
  const [busyId,setBusyId]=useState<string|null>(null);
  const [live,setLive]=useState(false);
  const [lastRealtimeId,setLastRealtimeId]=useState<string|null>(null);
  const [filter,setFilter]=useState<"all"|"new"|"accepted">("all");
  const [notificationPermission,setNotificationPermission]=useState<
    NotificationPermission|"unsupported"
  >("unsupported");

  async function load(id:string){
    const supabase=createClient();

    const {error:purgeError}=await supabase.rpc(
      "purge_expired_business_customer_requests",
      {p_business_id:id}
    );

    if(purgeError) throw purgeError;

    const {data,error}=await supabase
      .from("business_customer_requests")
      .select("*")
      .eq("business_id",id)
      .gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false})
      .limit(100);

    if(error) throw error;

    const offerIds=[...new Set(
      (data ?? [])
        .map((item)=>item.offer_id)
        .filter((id):id is string=>Boolean(id))
    )];

    if(offerIds.length>0){
      const {data:offers,error:offerError}=await supabase
        .from("business_offers")
        .select("id,title")
        .in("id",offerIds);

      if(offerError) throw offerError;

      setOfferTitles(
        Object.fromEntries((offers ?? []).map((offer)=>[offer.id,offer.title]))
      );
    }else{
      setOfferTitles({});
    }

    setRequests(data ?? []);
    setStatus(
      (data ?? []).length
        ? "Solicitudes activas del comercio."
        : "No hay solicitudes activas."
    );
  }

  useEffect(()=>{
    if(typeof window!=="undefined" && "Notification" in window){
      setNotificationPermission(Notification.permission);
    }

    let active=true;
    let cleanup:undefined|(()=>void);

    getOwnedMerchantBusiness()
      .then(async(business)=>{
        if(!active) return;
        if(!business){
          setStatus("Conecta primero un comercio para recibir solicitudes.");
          return;
        }

        setBusinessId(business.id);
        await load(business.id);

        if(!active) return;

        const supabase=createClient();
        const channel=supabase
          .channel("merchant-requests:"+business.id)
          .on(
            "postgres_changes",
            {
              event:"INSERT",
              schema:"public",
              table:"business_customer_requests",
              filter:"business_id=eq."+business.id
            },
            async(payload)=>{
              const nextId=String((payload.new as {id?:string}).id ?? "");
              setLastRealtimeId(nextId || null);
              setStatus("Nueva solicitud recibida en tiempo real.");

              if(
                typeof window!=="undefined" &&
                "Notification" in window &&
                Notification.permission==="granted"
              ){
                new Notification("Nueva solicitud en NAVIBORI",{
                  body:"Tienes una nueva solicitud de cliente."
                });
              }

              await load(business.id);
            }
          )
          .subscribe((channelStatus)=>{
            setLive(channelStatus==="SUBSCRIBED");
          });

        cleanup=()=>{
          setLive(false);
          supabase.removeChannel(channel);
        };
      })
      .catch((error)=>{
        if(active) setStatus(error instanceof Error ? error.message : "No se pudo cargar la bandeja.");
      });

    return ()=>{
      active=false;
      cleanup?.();
    };
  },[]);

  async function enableNotifications(){
    if(typeof window==="undefined" || !("Notification" in window)){
      setNotificationPermission("unsupported");
      setStatus("Este navegador no admite notificaciones locales.");
      return;
    }

    const permission=await Notification.requestPermission();
    setNotificationPermission(permission);
    setStatus(
      permission==="granted"
        ? "Notificaciones locales activadas mientras uses Merchant Console."
        : "Las notificaciones no fueron autorizadas."
    );
  }

  async function updateRequest(id:string,next:"accepted"|"completed"|"cancelled"){
    if(!businessId) return;
    setBusyId(id);

    try{
      const supabase=createClient();
      const {error}=await supabase.rpc("update_business_customer_request_status",{
        p_request_id:id,
        p_status:next
      });

      if(error) throw error;
      await load(businessId);
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.");
    }finally{
      setBusyId(null);
    }
  }

  const visibleRequests=requests.filter((request)=>
    filter==="all" ? true : request.status===filter
  );

  function csvCell(value:unknown){
    const raw=String(value ?? "");
    const safe=/^[=+\-@]/.test(raw) ? "'"+raw : raw;
    return '"'+safe.replace(/"/g,'""')+'"';
  }

  function exportCsv(){
    if(visibleRequests.length===0){
      setStatus("No hay solicitudes en el filtro actual para exportar.");
      return;
    }

    const header=[
      "Referencia",
      "Fecha",
      "Estado",
      "Cliente",
      "Contacto",
      "Método",
      "Oferta",
      "Cantidad",
      "Modalidad",
      "Fecha solicitada",
      "Nota"
    ];

    const rows=visibleRequests.map((request)=>[
      request.id.slice(0,8),
      request.created_at,
      request.status,
      request.customer_name,
      request.contact_value,
      request.contact_method,
      request.offer_id ? (offerTitles[request.offer_id] ?? "Producto/servicio") : "Solicitud general",
      request.quantity,
      request.fulfillment_method,
      request.requested_for ?? "",
      request.note ?? ""
    ]);

    const csv=[header,...rows]
      .map((row)=>row.map(csvCell).join(","))
      .join("\r\n");

    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download="navibori-solicitudes-"+new Date().toISOString().slice(0,10)+".csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("CSV exportado con "+visibleRequests.length+" solicitudes.");
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

  return (
    <section className="merchant-request-inbox">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">REQUEST INBOX</p>
          <h2>Solicitudes de clientes</h2>
        </div>
        <div className="request-inbox-status">
          <span className={"realtime-badge "+(live?"live":"offline")}>
            {live ? "LIVE" : "SYNC"}
          </span>
          <span>{requests.filter((item)=>item.status==="new").length} nuevas</span>
        </div>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="request-toolbar">
        <div className="request-filter-switch" aria-label="Filtrar solicitudes">
        <button
          type="button"
          className={filter==="all" ? "active" : ""}
          onClick={()=>setFilter("all")}
          aria-pressed={filter==="all"}
        >
          Todas
        </button>
        <button
          type="button"
          className={filter==="new" ? "active" : ""}
          onClick={()=>setFilter("new")}
          aria-pressed={filter==="new"}
        >
          Nuevas
        </button>
          <button
            type="button"
            className={filter==="accepted" ? "active" : ""}
            onClick={()=>setFilter("accepted")}
            aria-pressed={filter==="accepted"}
          >
            Aceptadas
          </button>
        </div>

        <button
          type="button"
          className="request-export-button"
          onClick={exportCsv}
          disabled={visibleRequests.length===0}
        >
          Exportar CSV
        </button>

        {notificationPermission!=="unsupported" && notificationPermission!=="granted" && (
          <button
            type="button"
            className="request-notification-button"
            onClick={enableNotifications}
          >
            Activar notificaciones
          </button>
        )}

        {notificationPermission==="granted" && (
          <span className="request-notification-ready">Notificaciones activas</span>
        )}
      </div>

      <div className="merchant-request-list">
        {visibleRequests.map((request)=>(
          <article
            key={request.id}
            className={request.id===lastRealtimeId ? "request-realtime-new" : ""}
          >
            <div className="merchant-request-top">
              <div>
                <span className={"request-status "+request.status}>{request.status}</span>
                <strong>{request.customer_name}</strong>
                <small>{new Date(request.created_at).toLocaleString()}</small>
              </div>
              <b>x{request.quantity}</b>
            </div>

            <dl>
              <div>
                <dt>Contacto</dt>
                <dd>{request.contact_method}: {request.contact_value}</dd>
              </div>
              <div>
                <dt>Oferta</dt>
                <dd>{request.offer_id ? (offerTitles[request.offer_id] ?? "Producto/servicio") : "Solicitud general"}</dd>
              </div>
              <div>
                <dt>Modalidad</dt>
                <dd>
                  {request.fulfillment_method==="pickup"
                    ? "Pickup / recogido"
                    : request.fulfillment_method==="reservation"
                      ? "Reservación / cita"
                      : "Contactar al cliente"}
                </dd>
              </div>
              <div>
                <dt>Fecha solicitada</dt>
                <dd>{request.requested_for ? new Date(request.requested_for).toLocaleString() : "—"}</dd>
              </div>
              <div><dt>Nota</dt><dd>{request.note || "—"}</dd></div>
            </dl>

            <div className="commerce-review-actions">
              <a
                className="request-contact-action"
                href={contactHref(request)}
                target={request.contact_method==="whatsapp" ? "_blank" : undefined}
                rel={request.contact_method==="whatsapp" ? "noreferrer" : undefined}
              >
                Contactar
              </a>
              <button
                type="button"
                disabled={busyId===request.id || request.status!=="new"}
                onClick={()=>updateRequest(request.id,"accepted")}
              >
                Aceptar
              </button>
              <button
                type="button"
                disabled={busyId===request.id || request.status==="completed" || request.status==="cancelled"}
                onClick={()=>updateRequest(request.id,"completed")}
              >
                Completar
              </button>
              <button
                type="button"
                disabled={busyId===request.id || request.status==="completed" || request.status==="cancelled"}
                onClick={()=>updateRequest(request.id,"cancelled")}
              >
                Cancelar
              </button>
            </div>
          </article>
        ))}

        {visibleRequests.length===0 && (
          <p className="merchant-empty">
            {requests.length===0 ? "La bandeja está vacía." : "No hay solicitudes en este filtro."}
          </p>
        )}
      </div>

      <small>Las solicitudes con más de 30 días se eliminan al abrir la bandeja. NAVIBORI no procesa pagos ni almacena tarjetas.</small>
    </section>
  );
}
