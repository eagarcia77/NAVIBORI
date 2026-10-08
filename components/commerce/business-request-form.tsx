"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CommerceOffer,
  CommerceServiceSettings
} from "@/lib/commerce/types";

type FulfillmentMethod="contact_back"|"pickup"|"reservation";

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

  const value=(type:string)=>parts.find((part)=>part.type===type)?.value ?? "";
  return value("year")+"-"+value("month")+"-"+value("day");
}

function addDaysToIsoDate(value:string,days:number){
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
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

  const today=useMemo(
    ()=>dateInTimeZone(new Date(),settings.timezone),
    [settings.timezone]
  );
  const maxDate=useMemo(
    ()=>addDaysToIsoDate(today,settings.maxAdvanceDays),
    [today,settings.maxAdvanceDays]
  );

  const [offerId,setOfferId]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [name,setName]=useState("");
  const [contactMethod,setContactMethod]=useState<"phone"|"whatsapp"|"email">("whatsapp");
  const [contactValue,setContactValue]=useState("");
  const [fulfillment,setFulfillment]=useState<FulfillmentMethod>("contact_back");
  const [requestedDate,setRequestedDate]=useState("");
  const [requestedFor,setRequestedFor]=useState("");
  const [slots,setSlots]=useState<FulfillmentSlot[]>([]);
  const [slotStatus,setSlotStatus]=useState("");
  const [note,setNote]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let active=true;

    if(fulfillment==="contact_back" || !requestedDate){
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
        p_business_id:businessId,
        p_fulfillment_method:fulfillment,
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
  },[businessId,fulfillment,requestedDate]);

  function formatSlot(slot:string){
    return new Intl.DateTimeFormat("es-PR",{
      timeZone:settings.timezone,
      hour:"numeric",
      minute:"2-digit"
    }).format(new Date(slot));
  }

  async function submit(){
    setBusy(true);
    setStatus("Enviando solicitud…");

    try{
      if(fulfillment!=="contact_back" && !requestedFor){
        throw new Error("Selecciona un horario disponible.");
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
          fulfillment==="contact_back"
            ? undefined
            : requestedFor
      });

      if(error) throw error;

      setStatus("Solicitud enviada. Referencia: "+String(data).slice(0,8));
      setOfferId("");
      setQuantity(1);
      setName("");
      setContactValue("");
      setFulfillment("contact_back");
      setRequestedDate("");
      setRequestedFor("");
      setSlots([]);
      setNote("");
    }catch(error){
      const message=error instanceof Error ? error.message : "No se pudo enviar la solicitud.";
      setStatus(
        message.includes("slot is full")
          ? "Ese horario acaba de llenarse. Selecciona otro slot."
          : message
      );

      if(message.includes("slot is full") && requestedDate){
        setRequestedFor("");
        const supabase=createClient();
        const {data}=await supabase.rpc("get_business_fulfillment_slots",{
          p_business_id:businessId,
          p_fulfillment_method:fulfillment,
          p_local_date:requestedDate
        });
        setSlots((data ?? []) as FulfillmentSlot[]);
      }
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
          <p>
            Envía una solicitud a {businessName}. El comercio debe confirmarla; NAVIBORI no procesa pagos.
          </p>
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
              setRequestedDate("");
              setRequestedFor("");
            }}
          >
            {methods.map((method)=>(
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
        </label>

        {fulfillment!=="contact_back" && (
          <>
            <label>
              Fecha
              <input
                type="date"
                min={today}
                max={maxDate}
                value={requestedDate}
                onChange={(e)=>setRequestedDate(e.target.value)}
              />
            </label>

            <label className="merchant-wide">
              Horario disponible
              <select
                value={requestedFor}
                disabled={!requestedDate || slots.length===0}
                onChange={(e)=>setRequestedFor(e.target.value)}
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
                        : "Lleno"}
                    </option>
                  );
                })}
              </select>
              {slotStatus && <small className="slot-status">{slotStatus}</small>}
            </label>
          </>
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
        Los horarios se calculan según la capacidad configurada y el horario publicado del comercio.
      </small>
    </section>
  );
}
