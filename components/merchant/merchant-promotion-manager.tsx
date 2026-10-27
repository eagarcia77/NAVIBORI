"use client";

import {useCallback,useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import type {Database} from "@/lib/supabase/database.types";

type Promotion=Database["public"]["Tables"]["business_promotions"]["Row"];
export type MerchantPromotionBusiness={
  id:string;
  name:string;
  status:string;
  verificationStatus:string;
  locationVerified:boolean;
  ownershipVerified:boolean;
};

type Draft={
  id:string|null;
  title:string;
  description:string;
  startsAt:string;
  endsAt:string;
  active:boolean;
};

const emptyDraft:Draft={
  id:null,title:"",description:"",startsAt:"",endsAt:"",active:false
};

function localDateTime(value:string|null):string{
  if(!value)return "";
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return "";
  const pad=(n:number)=>String(n).padStart(2,"0");
  return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+
    "T"+pad(date.getHours())+":"+pad(date.getMinutes());
}

function toIso(value:string):string|null{
  if(!value)return null;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw new Error("Fecha u hora inválida.");
  return date.toISOString();
}

function validate(draft:Draft,allowActivation:boolean){
  const title=draft.title.trim();
  const description=draft.description.trim();
  if(!title||title.length>120)throw new Error("El título debe contener entre 1 y 120 caracteres.");
  if(description.length>1000)throw new Error("La descripción no puede exceder 1,000 caracteres.");
  const start=toIso(draft.startsAt);
  const end=toIso(draft.endsAt);
  if(start&&end&&Date.parse(start)>Date.parse(end))
    throw new Error("La fecha final debe ser posterior al comienzo.");
  if(draft.active&&!allowActivation)
    throw new Error("Solo los comercios activos y verificados pueden activar ofertas.");
  return {title,description,starts_at:start,ends_at:end,active:draft.active};
}

function visibleState(promotion:Promotion,canActivate:boolean){
  if(!promotion.active)return "Pausada";
  if(!canActivate)return "En borrador";
  const now=Date.now();
  if(promotion.starts_at&&Date.parse(promotion.starts_at)>now)return "Programada";
  if(promotion.ends_at&&Date.parse(promotion.ends_at)<now)return "Vencida";
  return "Vigente";
}

export default function MerchantPromotionManager({
  businesses
}:{businesses:MerchantPromotionBusiness[]}){
  const [businessId,setBusinessId]=useState(businesses[0]?.id??"");
  const business=businesses.find(item=>item.id===businessId);
  const canActivate=business?.status==="active"&&business.verificationStatus==="verified"&&business.locationVerified&&business.ownershipVerified;
  const [records,setRecords]=useState<Promotion[]>([]);
  const [draft,setDraft]=useState<Draft>(emptyDraft);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const refresh=useCallback(async(id:string,stillActive?:()=>boolean)=>{
    if(!id){setRecords([]);return;}
    setLoading(true);
    try{
      const client=createClient();
      const {data,error:dbError}=await client.from("business_promotions")
        .select("*")
        .eq("business_id",id)
        .order("created_at",{ascending:false});
      if(dbError)throw dbError;
      if(!stillActive||stillActive())setRecords(data??[]);
    }catch(caught){
      if(!stillActive||stillActive())setError(
        caught instanceof Error?caught.message:"No pudimos cargar las promociones."
      );
    }finally{
      if(!stillActive||stillActive())setLoading(false);
    }
  },[]);

  useEffect(()=>{
    let active=true;
    setDraft(emptyDraft);
    setRecords([]);
    setError("");
    setMessage("");
    void refresh(businessId,()=>active);
    return ()=>{active=false;};
  },[businessId,refresh]);

  function edit(row:Promotion){
    setDraft({
      id:row.id,title:row.title,description:row.description,
      startsAt:localDateTime(row.starts_at),
      endsAt:localDateTime(row.ends_at),active:row.active
    });
    setMessage("");
    setError("");
  }

  function reset(){
    setDraft(emptyDraft);
    setError("");
    setMessage("");
  }

  async function save(){
    if(!businessId||busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const payload=validate(draft,Boolean(canActivate));
      const client=createClient();
      if(draft.id){
        const {data,error:dbError}=await client.from("business_promotions")
          .update(payload)
          .eq("id",draft.id)
          .eq("business_id",businessId)
          .select("id")
          .single();
        if(dbError||!data)throw dbError??new Error("No tienes permiso para editar esta oferta.");
      }else{
        const {data,error:dbError}=await client.from("business_promotions")
          .insert({...payload,business_id:businessId})
          .select("id")
          .single();
        if(dbError||!data)throw dbError??new Error("No tienes permiso para crear esta oferta.");
      }
      setDraft(emptyDraft);
      await refresh(businessId);
      setMessage("Promoción guardada en Supabase.");
    }catch(caught){
      setError(caught instanceof Error?caught.message:"No se pudo guardar la promoción.");
    }finally{
      setBusy(false);
    }
  }

  async function changeStatus(row:Promotion){
    if(busy)return;
    const next=!row.active;
    if(next&&!canActivate){setError("El comercio debe estar activo y verificado.");return;}
    setBusy(true);setError("");setMessage("");
    try{
      const client=createClient();
      const {data,error:dbError}=await client.from("business_promotions")
        .update({active:next})
        .eq("id",row.id)
        .eq("business_id",businessId)
        .select("id").single();
      if(dbError||!data)throw dbError??new Error("No se pudo cambiar el estado.");
      await refresh(businessId);
      setMessage(next?"Promoción activada.":"Promoción pausada.");
      if(draft.id===row.id)setDraft(previous=>({...previous,active:next}));
    }catch(caught){
      setError(caught instanceof Error?caught.message:"Cambio no autorizado.");
    }finally{
      setBusy(false);
    }
  }

  async function sendPush(row:Promotion){
    if(busy||!canActivate||visibleState(row,true)!=="Vigente")return;
    setBusy(true);setError("");setMessage("");
    try{
      const {data,error}=await createClient().functions.invoke("send-promotion-push",{
        body:{businessId,promotionId:row.id}
      });
      if(error)throw error;
      setMessage(data?.duplicate?"Este anuncio ya se envió.":data?.noSubscribers?"No hay dispositivos suscritos todavía.":
        "Envío aceptado por el servicio push para "+Number(data?.sentCount??0)+" dispositivo(s). La recepción depende del celular.");
    }catch{setError("No se pudo enviar el anuncio. Verifica que siga vigente y que tengas acceso al comercio.");}
    finally{setBusy(false);}
  }

  if(!businesses.length){
    return <section className="merchant-promotion-manager" role="status">
      <h2>Aún no tienes un comercio autorizado</h2>
      <p>Registra tu comercio desde la consola. Solo puedes administrar anuncios propios; publicarlos requiere revisar el negocio.</p>
      <a href="/merchant">Ir a mi comercio</a>
    </section>;
  }

  return <section className="merchant-promotion-manager"
    aria-label="Administrador de promociones">
    <div className="merchant-section-head">
      <div>
        <p className="eyebrow">NAVIBORI · PROMOCIONES</p>
        <h2>Administrar promociones</h2>
        <p>Los cambios se guardan en Supabase. Solo puedes editar tus comercios
          y tu membresía debe estar vigente.</p>
      </div>
    </div>

    <label>
      Comercio
      <select value={businessId} onChange={event=>setBusinessId(event.target.value)}>
        {businesses.map(item=><option key={item.id} value={item.id}>
          {item.name} · {item.status==="active"?"Publicado":"Borrador"}
        </option>)}
      </select>
    </label>
    {!canActivate&&<p className="merchant-promotion-notice" role="status">
      Este comercio todavía no está activo y verificado. Puedes preparar
      promociones, pero no activarlas públicamente.
    </p>}

    <div className="merchant-promotion-layout">
      <div>
        <h3>Promociones del comercio</h3>
        {loading?<p role="status">Cargando promociones…</p>:
          records.length===0?<p>Todavía no hay promociones.</p>:
          <ul className="merchant-promotion-list">
            {records.map(row=><li key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <small>{visibleState(row,Boolean(canActivate))}</small>
                {row.description&&<p>{row.description}</p>}
              </div>
              <div className="merchant-promotion-row-actions">
                <button type="button" disabled={busy} onClick={()=>edit(row)}>
                  Editar
                </button>
                <button type="button" disabled={busy||(!row.active&&!canActivate)}
                  onClick={()=>void changeStatus(row)}>
                  {row.active?"Pausar":"Activar"}
                </button>
                <button type="button" disabled={busy||!canActivate||visibleState(row,true)!=="Vigente"} onClick={()=>void sendPush(row)}>
                  Enviar aviso general
                </button>
              </div>
            </li>)}
          </ul>}
      </div>

      <form onSubmit={event=>{event.preventDefault();void save();}}>
        <h3>{draft.id?"Editar promoción":"Nueva promoción"}</h3>
        <label>
          Título (máximo 120 caracteres)
          <input required maxLength={120} value={draft.title}
            onChange={event=>setDraft(v=>({...v,title:event.target.value}))}/>
        </label>
        <label>
          Descripción
          <textarea maxLength={1000} rows={4} value={draft.description}
            onChange={event=>setDraft(v=>({...v,description:event.target.value}))}/>
        </label>
        <label>
          Inicio (opcional)
          <input type="datetime-local" value={draft.startsAt}
            onChange={event=>setDraft(v=>({...v,startsAt:event.target.value}))}/>
        </label>
        <label>
          Fin (opcional)
          <input type="datetime-local" value={draft.endsAt}
            onChange={event=>setDraft(v=>({...v,endsAt:event.target.value}))}/>
        </label>
        <label className="merchant-promotion-checkbox">
          <input type="checkbox" checked={draft.active} disabled={!canActivate}
            onChange={event=>setDraft(v=>({...v,active:event.target.checked}))}/>
          Promoción activa
        </label>
        <div className="merchant-actions">
          <button type="submit" disabled={busy||loading}>
            {busy?"Guardando…":"Guardar promoción"}
          </button>
          <button type="button" disabled={busy} onClick={reset}>Nueva / Limpiar</button>
        </div>
      </form>
    </div>
    {message&&<p role="status" className="merchant-promotion-success">{message}</p>}
    {error&&<p role="alert" className="merchant-promotion-error">{error}</p>}
    <small>Los avisos generales se envían solo a dispositivos suscritos; los avisos de cercanía requieren ubicación y permiso en el celular. Una promoción no garantiza inventario ni disponibilidad. La publicación
      en el mapa exige un comercio verificado y una oferta vigente.</small>
  </section>;
}
