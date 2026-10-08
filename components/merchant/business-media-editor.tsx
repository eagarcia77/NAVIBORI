"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import type { Database } from "@/lib/supabase/database.types";

type MediaRow=Database["public"]["Tables"]["business_media"]["Row"];
type MediaView=MediaRow & {previewUrl:string};
type MediaKind="logo"|"cover"|"gallery";

const MIME_EXT:Record<string,string>={
  "image/jpeg":"jpg",
  "image/png":"png",
  "image/webp":"webp",
  "image/avif":"avif"
};

export default function BusinessMediaEditor(){
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [businessStatus,setBusinessStatus]=useState<string|null>(null);
  const [verificationStatus,setVerificationStatus]=useState<string|null>(null);
  const [media,setMedia]=useState<MediaView[]>([]);
  const [kind,setKind]=useState<MediaKind>("logo");
  const [altText,setAltText]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [status,setStatus]=useState("Verificando comercio…");
  const [busy,setBusy]=useState(false);

  const supabase=createClient();
  const editable=
    Boolean(businessId) &&
    verificationStatus!=="pending" &&
    (businessStatus==="draft" || businessStatus==="active");

  async function loadMedia(id:string){
    const {data,error}=await supabase
      .from("business_media")
      .select("*")
      .eq("business_id",id)
      .order("kind")
      .order("sort_order");

    if(error) throw error;

    const views=await Promise.all(
      (data ?? []).map(async(item)=>{
        const {data:signed,error:signedError}=await supabase.storage
          .from("business-media")
          .createSignedUrl(item.storage_path,3600);

        if(signedError || !signed?.signedUrl) return null;
        return {...item,previewUrl:signed.signedUrl};
      })
    );

    setMedia(
      views.filter((item):item is MediaView=>Boolean(item))
    );
  }

  useEffect(()=>{
    let active=true;

    getOwnedMerchantBusiness()
      .then(async(business)=>{
        if(!active) return;

        if(!business){
          setStatus("Sincroniza primero el perfil del comercio para habilitar imágenes.");
          return;
        }

        setBusinessId(business.id);
        setBusinessStatus(business.status);
        setVerificationStatus(business.verificationStatus);

        if(business.verificationStatus==="pending"){
          setStatus("Media bloqueada mientras el comercio está pendiente de revisión.");
        }else{
          setStatus("Logo, portada y galería almacenados en NAVIBORI Storage.");
        }

        await loadMedia(business.id);
      })
      .catch((error)=>{
        if(active) setStatus(error instanceof Error ? error.message : "No se pudo cargar la media.");
      });

    return ()=>{active=false};
  },[]);

  async function upload(){
    if(!businessId || !file) return;

    const cleanAlt=altText.trim();
    if(!cleanAlt){
      setStatus("El texto alternativo es obligatorio.");
      return;
    }

    if(!MIME_EXT[file.type]){
      setStatus("Formato no permitido. Usa JPEG, PNG, WebP o AVIF.");
      return;
    }

    if(file.size>5*1024*1024){
      setStatus("La imagen supera el límite de 5 MB.");
      return;
    }

    setBusy(true);
    setStatus("Subiendo imagen…");

    const extension=MIME_EXT[file.type];
    const path=businessId+"/"+kind+"/"+crypto.randomUUID()+"."+extension;

    try{
      const {error:uploadError}=await supabase.storage
        .from("business-media")
        .upload(path,file,{
          cacheControl:"3600",
          contentType:file.type,
          upsert:false
        });

      if(uploadError) throw uploadError;

      if(kind==="logo" || kind==="cover"){
        const existing=media.filter((item)=>item.kind===kind);
        if(existing.length>0){
          const {error:deleteRowsError}=await supabase
            .from("business_media")
            .delete()
            .in("id",existing.map((item)=>item.id));

          if(deleteRowsError) throw deleteRowsError;

          await supabase.storage
            .from("business-media")
            .remove(existing.map((item)=>item.storage_path));
        }
      }

      const sortOrder=kind==="gallery"
        ? media.filter((item)=>item.kind==="gallery").length
        : 0;

      const {data:{user}}=await supabase.auth.getUser();
      if(!user) throw new Error("Sesión requerida.");

      const {error:insertError}=await supabase
        .from("business_media")
        .insert({
          business_id:businessId,
          kind,
          storage_path:path,
          alt_text:cleanAlt,
          sort_order:sortOrder,
          created_by:user.id
        });

      if(insertError){
        await supabase.storage.from("business-media").remove([path]);
        throw insertError;
      }

      await loadMedia(businessId);
      setFile(null);
      setAltText("");
      setStatus("Imagen guardada correctamente.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la imagen.");
    }finally{
      setBusy(false);
    }
  }

  async function remove(item:MediaRow){
    if(!businessId) return;
    setBusy(true);

    try{
      const {error:rowError}=await supabase
        .from("business_media")
        .delete()
        .eq("id",item.id);

      if(rowError) throw rowError;

      const {error:storageError}=await supabase.storage
        .from("business-media")
        .remove([item.storage_path]);

      if(storageError) throw storageError;

      await loadMedia(businessId);
      setStatus("Imagen eliminada.");
    }catch(error){
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la imagen.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="merchant-media-editor">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">IDENTIDAD VISUAL</p>
          <h2>Logo, portada y galería</h2>
        </div>
        <span className={"commerce-lifecycle "+(businessStatus ?? "draft")}>
          {businessStatus ?? "local"}
        </span>
      </div>

      <p className="merchant-media-status" role="status">{status}</p>

      <div className="merchant-media-form">
        <label>
          Tipo
          <select
            value={kind}
            disabled={!editable || busy}
            onChange={(e)=>setKind(e.target.value as MediaKind)}
          >
            <option value="logo">Logo</option>
            <option value="cover">Portada</option>
            <option value="gallery">Galería</option>
          </select>
        </label>

        <label>
          Texto alternativo
          <input
            value={altText}
            disabled={!editable || busy}
            onChange={(e)=>setAltText(e.target.value)}
            placeholder="Describe la imagen para accesibilidad"
          />
        </label>

        <label className="merchant-media-file">
          Imagen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={!editable || busy}
            onChange={(e)=>setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="button"
          onClick={upload}
          disabled={!editable || busy || !file || !altText.trim()}
        >
          {busy ? "Procesando…" : "Guardar imagen"}
        </button>
      </div>

      <div className="merchant-media-grid">
        {media.map((item)=>(
          <article key={item.id}>
            <img src={item.previewUrl} alt={item.alt_text} />
            <div>
              <span>{item.kind}</span>
              <strong>{item.alt_text}</strong>
            </div>
            <button
              type="button"
              disabled={!editable || busy}
              onClick={()=>remove(item)}
            >
              Eliminar
            </button>
          </article>
        ))}

        {media.length===0 && (
          <p className="merchant-empty">Todavía no hay imágenes cargadas.</p>
        )}
      </div>

      <small>
        Máximo 5 MB por archivo. Formatos: JPEG, PNG, WebP y AVIF. El texto alternativo es obligatorio.
      </small>
    </section>
  );
}
