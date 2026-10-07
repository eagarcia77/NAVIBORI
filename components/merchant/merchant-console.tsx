"use client";

import { useEffect, useMemo, useState } from "react";
import { slugifyBusinessName } from "@/lib/commerce/slug";
import { buildBusinessDeepLink, buildBusinessQrPayload } from "@/lib/commerce/deep-link";

type Draft = {
  name:string;
  category:string;
  description:string;
  phone:string;
  whatsapp:string;
  website:string;
  featuredOffer:string;
  promotion:string;
  featuredPrice:string;
  opens:string;
  closes:string;
};

const emptyDraft:Draft = {
  name:"",
  category:"gastronomia",
  description:"",
  phone:"",
  whatsapp:"",
  website:"",
  featuredOffer:"",
  promotion:"",
  featuredPrice:"",
  opens:"10:00",
  closes:"18:00"
};

export default function MerchantConsole() {
  const [draft,setDraft] = useState<Draft>(emptyDraft);
  const [saved,setSaved] = useState(false);
  const [error,setError] = useState("");
  const [origin,setOrigin] = useState("");

  useEffect(()=>{
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  },[]);

  useEffect(()=>{
    try {
      const stored=localStorage.getItem("navibori:merchant-draft");
      if (stored) setDraft(JSON.parse(stored));
    } catch {}
  },[]);

  function update<K extends keyof Draft>(key:K,value:Draft[K]) {
    setSaved(false);
    setError("");
    setDraft((current)=>({...current,[key]:value}));
  }

  const slug=useMemo(()=>slugifyBusinessName(draft.name || "comercio-demo"),[draft.name]);
  const deepLink=origin ? buildBusinessDeepLink(origin,slug) : "";
  const qrPayload=origin ? buildBusinessQrPayload(origin,slug) : "";

  function saveDraft() {
    if (!draft.name.trim()) {
      setError("Escribe el nombre del comercio antes de guardar.");
      return;
    }

    if (draft.website && !/^https?:\/\//i.test(draft.website)) {
      setError("El sitio web debe comenzar con http:// o https://.");
      return;
    }

    if (draft.whatsapp && !/^\+?[1-9][0-9]{7,14}$/.test(draft.whatsapp.replace(/[\s()-]/g,""))) {
      setError("WhatsApp debe usar un número internacional válido, por ejemplo +17875551234.");
      return;
    }

    if (draft.whatsapp) {
      draft.whatsapp=draft.whatsapp.replace(/[\s()-]/g,"");
    }

    localStorage.setItem("navibori:merchant-draft",JSON.stringify(draft));
    window.dispatchEvent(new Event("navibori:merchant-draft-updated"));
    setSaved(true);
    setError("");
  }

  return (
    <section className="merchant-console">
      <div className="merchant-status">
        <div><span>MODE</span><strong>Local draft</strong></div>
        <div><span>PUBLISH</span><strong>Blocked</strong></div>
        <div><span>BACKEND</span><strong>RLS pending</strong></div>
      </div>

      <div className="merchant-form-grid">
        <label>
          Nombre del comercio
          <input value={draft.name} onChange={(e)=>update("name",e.target.value)} />
        </label>

        <label>
          Categoría
          <select value={draft.category} onChange={(e)=>update("category",e.target.value)}>
            <option value="gastronomia">Gastronomía</option>
            <option value="compras">Compras</option>
            <option value="artesania">Artesanía</option>
            <option value="servicios">Servicios</option>
            <option value="bienestar">Bienestar</option>
            <option value="otros">Otros</option>
          </select>
        </label>

        <label className="merchant-wide">
          Descripción
          <textarea rows={4} value={draft.description} onChange={(e)=>update("description",e.target.value)} />
        </label>

        <label>
          Teléfono
          <input value={draft.phone} onChange={(e)=>update("phone",e.target.value)} />
        </label>

        <label>
          WhatsApp
          <input
            inputMode="tel"
            placeholder="+1787..."
            value={draft.whatsapp}
            onChange={(e)=>update("whatsapp",e.target.value)}
          />
        </label>

        <label>
          Sitio web
          <input value={draft.website} onChange={(e)=>update("website",e.target.value)} />
        </label>

        <label>
          Producto/servicio destacado
          <input value={draft.featuredOffer} onChange={(e)=>update("featuredOffer",e.target.value)} />
        </label>

        <label>
          Promoción
          <input value={draft.promotion} onChange={(e)=>update("promotion",e.target.value)} />
        </label>

        <label>
          Precio destacado
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={draft.featuredPrice}
            onChange={(e)=>update("featuredPrice",e.target.value)}
          />
        </label>

        <label>
          Horario base
          <div className="merchant-hour-row">
            <input type="time" value={draft.opens} onChange={(e)=>update("opens",e.target.value)} />
            <span>a</span>
            <input type="time" value={draft.closes} onChange={(e)=>update("closes",e.target.value)} />
          </div>
        </label>
      </div>

      <div className="merchant-actions">
        <button type="button" onClick={saveDraft}>Guardar borrador local</button>
        <button type="button" disabled>Publicar</button>
        {saved && <span role="status">Borrador guardado en este dispositivo.</span>}
        {error && <span role="alert" className="merchant-error">{error}</span>}
      </div>

      <aside className="merchant-preview">
        <span className="commerce-demo-badge">PREVIEW</span>
        <h2>{draft.name || "Nombre del comercio"}</h2>
        <p>{draft.description || "La descripción aparecerá aquí."}</p>
        <dl>
          <div><dt>Categoría</dt><dd>{draft.category}</dd></div>
          <div><dt>Destacado</dt><dd>{draft.featuredOffer || "—"}</dd></div>
          <div><dt>Promoción</dt><dd>{draft.promotion || "—"}</dd></div>
          <div><dt>Precio</dt><dd>{draft.featuredPrice ? "$" + draft.featuredPrice : "—"}</dd></div>
          <div><dt>Horario base</dt><dd>{draft.opens} – {draft.closes}</dd></div>
          <div><dt>WhatsApp</dt><dd>{draft.whatsapp || "—"}</dd></div>
        </dl>

        <div className="merchant-link-box">
          <span>DEEPLINK / QR PAYLOAD</span>
          <code>{deepLink || "Se generará en navegador."}</code>
          <small>{qrPayload || "Payload pendiente."}</small>
        </div>
      </aside>
    </section>
  );
}
