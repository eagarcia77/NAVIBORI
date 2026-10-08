"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import type { Database } from "@/lib/supabase/database.types";

type RequestRow=Database["public"]["Tables"]["business_customer_requests"]["Row"];

export default function CustomerRequestInbox(){
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [requests,setRequests]=useState<RequestRow[]>([]);
  const [status,setStatus]=useState("Cargando solicitudes…");
  const [busyId,setBusyId]=useState<string|null>(null);

  async function load(id:string){
    const supabase=createClient();
    const {data,error}=await supabase
      .from("business_customer_requests")
      .select("*")
      .eq("business_id",id)
      .gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false})
      .limit(100);

    if(error) throw error;
    setRequests(data ?? []);
    setStatus(
      (data ?? []).length
        ? "Solicitudes activas del comercio."
        : "No hay solicitudes activas."
    );
  }

  useEffect(()=>{
    let active=true;

    getOwnedMerchantBusiness()
      .then(async(business)=>{
        if(!active) return;
        if(!business){
          setStatus("Conecta primero un comercio para recibir solicitudes.");
          return;
        }
        setBusinessId(business.id);
        await load(business.id);
      })
      .catch((error)=>{
        if(active) setStatus(error instanceof Error ? error.message : "No se pudo cargar la bandeja.");
      });

    return ()=>{active=false};
  },[]);

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

  return (
    <section className="merchant-request-inbox">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">REQUEST INBOX</p>
          <h2>Solicitudes de clientes</h2>
        </div>
        <span>{requests.filter((item)=>item.status==="new").length} nuevas</span>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="merchant-request-list">
        {requests.map((request)=>(
          <article key={request.id}>
            <div className="merchant-request-top">
              <div>
                <span className={"request-status "+request.status}>{request.status}</span>
                <strong>{request.customer_name}</strong>
                <small>{new Date(request.created_at).toLocaleString()}</small>
              </div>
              <b>x{request.quantity}</b>
            </div>

            <dl>
              <div><dt>Contacto</dt><dd>{request.contact_method}: {request.contact_value}</dd></div>
              <div><dt>Oferta</dt><dd>{request.offer_id ? request.offer_id.slice(0,8) : "Solicitud general"}</dd></div>
              <div><dt>Nota</dt><dd>{request.note || "—"}</dd></div>
            </dl>

            <div className="commerce-review-actions">
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

        {requests.length===0 && <p className="merchant-empty">La bandeja está vacía.</p>}
      </div>

      <small>Las solicitudes expiran a los 30 días. NAVIBORI no procesa pagos ni almacena tarjetas.</small>
    </section>
  );
}
