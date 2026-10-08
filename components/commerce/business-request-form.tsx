"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CommerceOffer,
  CommerceServiceSettings
} from "@/lib/commerce/types";

type FulfillmentMethod="contact_back"|"pickup"|"reservation";

function toLocalInput(date:Date){
  const offset=date.getTimezoneOffset();
  return new Date(date.getTime()-offset*60000).toISOString().slice(0,16);
}

export default function BusinessRequestForm({
  businessId,
  businessName,
  offers,
  settings
}:{
  businessId:string;
  businessName:string;
  offers:CommerceOffer[];
  settings:CommerceServiceSettings;
}){
  const availableOffers=offers.filter((offer)=>offer.available);
  const methods=useMemo(()=>{
    const next:Array<{value:FulfillmentMethod;label:string}>=[
      {value:"contact_back",label:"Contactarme"}
    ];
    if(settings.acceptsPickup){
      next.push({value:"pickup",label:"Pickup / recogido"});
    }
    if(settings.acceptsReservations){
      next.push({value:"reservation",label:"Reservación / cita"});
    }
    return next;
  },[settings.acceptsPickup,settings.acceptsReservations]);

  const [offerId,setOfferId]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [name,setName]=useState("");
  const [contactMethod,setContactMethod]=useState<"phone"|"whatsapp"|"email">("whatsapp");
  const [contactValue,setContactValue]=useState("");
  const [fulfillment,setFulfillment]=useState<FulfillmentMethod>("contact_back");
  const [requestedFor,setRequestedFor]=useState("");
  const [note,setNote]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  const minDate=useMemo(()=>{
    const date=new Date(Date.now()+settings.minLeadMinutes*60000);
    return toLocalInput(date);
  },[settings.minLeadMinutes]);

  const maxDate=useMemo(()=>{
    const date=new Date();
    date.setDate(date.getDate()+settings.maxAdvanceDays);
    return toLocalInput(date);
  },[settings.maxAdvanceDays]);

  async function submit(){
    setBusy(true);
    setStatus("Enviando solicitud…");

    try{
      if(fulfillment!=="contact_back" && !requestedFor){
        throw new Error("Selecciona la fecha y hora solicitada.");
      }

      const supabase=createClient();
      const selectedOffer=availableOffers.find((offer)=>offer.id===offerId);

      const {data,error}=await supabase.rpc("create_business_customer_request",{
        p_business_id:businessId,
        p_offer_id:offerId || undefined,
        p_request_type:selectedOffer ? "product" : "general",
        p_quantity:quantity,
        p_customer_name:name.trim(),
        p_contact_method:contactMethod,
        p_contact_value:contactValue.trim(),
        p_note:note.trim() || undefined,
        p_fulfillment_method:fulfillment,
        p_requested_for:
          fulfillment==="contact_back" || !requestedFor
            ? undefined
            : new Date(requestedFor).toISOString()
      });

      if(error) throw error;

      setStatus("Solicitud enviada. Referencia: "+String(data).slice(0,8));
      setOfferId("");
      setQuantity(1);
      setName("");
      setContactValue("");
      setFulfillment("contact_back");
      setRequestedFor("");
      setNote("");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="business-request-form" aria-labelledby="business-request-title">
      <div className="business-request-head">
        <div>
          <p className="eyebrow">SOLICITAR</p>
          <h2 id="business-request-title">Producto o servicio</h2>
          <p>Envía una solicitud a {businessName}. El comercio debe confirmarla; NAVIBORI no procesa pagos.</p>
        </div>
      </div>

      {settings.instructions && (
        <div className="business-request-instructions">{settings.instructions}</div>
      )}

      <div className="merchant-form-grid">
        <label>
          Producto/servicio
          <select value={offerId} onChange={(e)=>setOfferId(e.target.value)}>
            <option value="">Solicitud general</option>
            {availableOffers.map((offer)=>(
              <option key={offer.id} value={offer.id}>{offer.title}</option>
            ))}
          </select>
        </label>

        <label>
          Cantidad
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e)=>setQuantity(Math.max(1,Math.min(99,Number(e.target.value)||1)))}
          />
        </label>

        <label>
          Modalidad
          <select
            value={fulfillment}
            onChange={(e)=>{
              const value=e.target.value as FulfillmentMethod;
              setFulfillment(value);
              if(value==="contact_back") setRequestedFor("");
            }}
          >
            {methods.map((method)=>(
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
        </label>

        {fulfillment!=="contact_back" && (
          <label>
            Fecha y hora solicitada
            <input
              type="datetime-local"
              min={minDate}
              max={maxDate}
              value={requestedFor}
              onChange={(e)=>setRequestedFor(e.target.value)}
            />
          </label>
        )}

        <label>
          Nombre
          <input value={name} onChange={(e)=>setName(e.target.value)} />
        </label>

        <label>
          Método de contacto
          <select
            value={contactMethod}
            onChange={(e)=>setContactMethod(e.target.value as "phone"|"whatsapp"|"email")}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Teléfono</option>
            <option value="email">Email</option>
          </select>
        </label>

        <label className="merchant-wide">
          Contacto
          <input
            value={contactValue}
            onChange={(e)=>setContactValue(e.target.value)}
            placeholder={contactMethod==="email" ? "correo@ejemplo.com" : "+1787..."}
          />
        </label>

        <label className="merchant-wide">
          Nota
          <textarea rows={3} value={note} onChange={(e)=>setNote(e.target.value)} />
        </label>
      </div>

      <div className="merchant-actions">
        <button
          type="button"
          onClick={submit}
          disabled={
            busy ||
            !name.trim() ||
            !contactValue.trim() ||
            (fulfillment!=="contact_back" && !requestedFor)
          }
        >
          {busy ? "Enviando…" : "Enviar solicitud"}
        </button>
        {status && <span role="status">{status}</span>}
      </div>

      <small>
        NAVIBORI comparte estos datos únicamente con el comercio para gestionar esta solicitud.
      </small>
    </section>
  );
}
