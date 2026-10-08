"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import type { Database } from "@/lib/supabase/database.types";

type BlockRow=Database["public"]["Tables"]["business_fulfillment_blocks"]["Row"];
type Method="all"|"pickup"|"reservation";

function formatPr(value:string){
  return new Intl.DateTimeFormat("es-PR",{
    timeZone:"America/Puerto_Rico",
    dateStyle:"medium",
    timeStyle:"short"
  }).format(new Date(value));
}

export default function FulfillmentBlackoutEditor(){
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [businessStatus,setBusinessStatus]=useState<string|null>(null);
  const [verificationStatus,setVerificationStatus]=useState<string|null>(null);
  const [blocks,setBlocks]=useState<BlockRow[]>([]);
  const [method,setMethod]=useState<Method>("all");
  const [startsAt,setStartsAt]=useState("");
  const [endsAt,setEndsAt]=useState("");
  const [reason,setReason]=useState("");
  const [status,setStatus]=useState("Cargando bloqueos…");
  const [busy,setBusy]=useState(false);

  const editable=
    Boolean(businessId) &&
    verificationStatus!=="pending" &&
    (businessStatus==="draft" || businessStatus==="active");

  async function load(id:string){
    const supabase=createClient();
    const {data,error}=await supabase
      .from("business_fulfillment_blocks")
      .select("*")
      .eq("business_id",id)
      .gt("ends_at",new Date().toISOString())
      .order("starts_at",{ascending:true});

    if(error) throw error;
    setBlocks(data ?? []);
  }

  useEffect(()=>{
    let active=true;

    getOwnedMerchantBusiness()
      .then(async(business)=>{
        if(!active) return;

        if(!business){
          setStatus("Conecta primero un comercio para gestionar bloqueos.");
          return;
        }

        setBusinessId(business.id);
        setBusinessStatus(business.status);
        setVerificationStatus(business.verificationStatus);
        await load(business.id);

        if(active){
          setStatus(
            business.verificationStatus==="pending"
              ? "Bloqueos deshabilitados mientras el comercio está en revisión."
              : "Bloquea temporalmente fechas u horarios sin cambiar el horario semanal."
          );
        }
      })
      .catch((error)=>{
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudieron cargar los bloqueos.");
        }
      });

    return ()=>{active=false};
  },[]);

  async function addBlock(){
    if(!businessId || !startsAt || !endsAt) return;

    const start=new Date(startsAt);
    const end=new Date(endsAt);

    if(!(end>start)){
      setStatus("La hora de terminación debe ser posterior al inicio.");
      return;
    }

    setBusy(true);

    try{
      const supabase=createClient();
      const {error}=await supabase.rpc("create_business_fulfillment_block",{
        p_business_id:businessId,
        p_fulfillment_method:method,
        p_local_start:startsAt+":00",
        p_local_end:endsAt+":00",
        p_reason:reason.trim() || undefined
      });

      if(error) throw error;

      setStartsAt("");
      setEndsAt("");
      setReason("");
      await load(businessId);
      setStatus("Bloqueo añadido.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo crear el bloqueo.");
    }finally{
      setBusy(false);
    }
  }

  async function removeBlock(id:string){
    if(!businessId) return;
    setBusy(true);

    try{
      const supabase=createClient();
      const {error}=await supabase
        .from("business_fulfillment_blocks")
        .delete()
        .eq("id",id)
        .eq("business_id",businessId);

      if(error) throw error;
      await load(businessId);
      setStatus("Bloqueo eliminado.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el bloqueo.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="merchant-blackout-editor">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">AVAILABILITY CONTROL</p>
          <h2>Bloquear horarios</h2>
        </div>
        <span className={"commerce-lifecycle "+(businessStatus ?? "draft")}>
          {businessStatus ?? "local"}
        </span>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="merchant-form-grid">
        <label>
          Aplicar a
          <select
            value={method}
            disabled={!editable || busy}
            onChange={(e)=>setMethod(e.target.value as Method)}
          >
            <option value="all">Pickup y reservaciones</option>
            <option value="pickup">Solo pickup</option>
            <option value="reservation">Solo reservaciones</option>
          </select>
        </label>

        <label>
          Desde
          <input
            type="datetime-local"
            value={startsAt}
            disabled={!editable || busy}
            onChange={(e)=>setStartsAt(e.target.value)}
          />
        </label>

        <label>
          Hasta
          <input
            type="datetime-local"
            value={endsAt}
            disabled={!editable || busy}
            onChange={(e)=>setEndsAt(e.target.value)}
          />
        </label>

        <label className="merchant-wide">
          Razón opcional
          <input
            value={reason}
            disabled={!editable || busy}
            onChange={(e)=>setReason(e.target.value)}
            placeholder="Ej. Evento privado, mantenimiento o falta de personal"
          />
        </label>
      </div>

      <div className="merchant-actions">
        <button
          type="button"
          onClick={addBlock}
          disabled={!editable || busy || !startsAt || !endsAt}
        >
          {busy ? "Procesando…" : "Añadir bloqueo"}
        </button>
      </div>

      <div className="merchant-blackout-list">
        {blocks.map((block)=>(
          <article key={block.id}>
            <div>
              <span>{block.fulfillment_method}</span>
              <strong>{formatPr(block.starts_at)} → {formatPr(block.ends_at)}</strong>
              <small>{block.reason || "Sin razón especificada"}</small>
            </div>
            <button
              type="button"
              onClick={()=>removeBlock(block.id)}
              disabled={!editable || busy}
            >
              Eliminar
            </button>
          </article>
        ))}

        {blocks.length===0 && (
          <p className="merchant-empty">No hay bloqueos futuros.</p>
        )}
      </div>

      <small>
        Los visitantes no podrán seleccionar slots que se solapen con un bloqueo.
      </small>
    </section>
  );
}
