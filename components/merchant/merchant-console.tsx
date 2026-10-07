"use client";

import { useEffect, useState } from "react";

type Draft = {
  name:string;
  category:string;
  description:string;
  phone:string;
  website:string;
  featuredOffer:string;
  promotion:string;
};

const emptyDraft:Draft = {
  name:"",
  category:"gastronomia",
  description:"",
  phone:"",
  website:"",
  featuredOffer:"",
  promotion:""
};

export default function MerchantConsole() {
  const [draft,setDraft] = useState<Draft>(emptyDraft);
  const [saved,setSaved] = useState(false);
  const [error,setError] = useState("");

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

  function saveDraft() {
    if (!draft.name.trim()) {
      setError("Escribe el nombre del comercio antes de guardar.");
      return;
    }

    if (draft.website && !/^https?:\/\//i.test(draft.website)) {
      setError("El sitio web debe comenzar con http:// o https://.");
      return;
    }

    localStorage.setItem("navibori:merchant-draft",JSON.stringify(draft));
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
        </dl>
      </aside>
    </section>
  );
}
