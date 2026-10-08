"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommerceOffer } from "@/lib/commerce/types";

export default function BusinessRequestForm({
  businessId,
  businessName,
  offers
}:{
  businessId:string;
  businessName:string;
  offers:CommerceOffer[];
}){
  const availableOffers=offers.filter((offer)=>offer.available);
  const [offerId,setOfferId]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [name,setName]=useState("");
  const [contactMethod,setContactMethod]=useState<"phone"|"whatsapp"|"email">("whatsapp");
  const [contactValue,setContactValue]=useState("");
  const [note,setNote]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(){
    setBusy(true);
    setStatus("Enviando solicitud…");

    try{
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
        p_note:note.trim() || undefined
      });

      if(error) throw error;

      setStatus("Solicitud enviada. Referencia: "+String(data).slice(0,8));
      setOfferId("");
      setQuantity(1);
      setName("");
      setContactValue("");
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
          <p>Envía una solicitud a {businessName}. No se procesa pago en NAVIBORI.</p>
        </div>
      </div>

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
          disabled={busy || !name.trim() || !contactValue.trim()}
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
