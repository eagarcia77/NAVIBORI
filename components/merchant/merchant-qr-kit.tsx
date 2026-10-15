"use client";

import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";
import { buildBusinessDeepLink } from "@/lib/commerce/deep-link";

function makeQrSvg(value:string){
  const qr=qrcode(0,"M");
  qr.addData(value,"Byte");
  qr.make();
  return qr.createSvgTag({
    cellSize:6,
    margin:4,
    scalable:true
  });
}

export default function MerchantQrKit(){
  const [business,setBusiness]=useState<Awaited<ReturnType<typeof getOwnedMerchantBusiness>>>(null);
  const [origin,setOrigin]=useState("");
  const [status,setStatus]=useState("Preparando QR…");

  useEffect(()=>{
    let active=true;

    if(typeof window!=="undefined"){
      setOrigin(window.location.origin);
    }

    getOwnedMerchantBusiness()
      .then((owned)=>{
        if(!active) return;
        setBusiness(owned);
        setStatus(
          !owned
            ? "Conecta primero un comercio."
            : owned.status!=="active"
              ? "El QR público estará disponible cuando el comercio esté activo."
              : "QR local listo para imprimir o compartir."
        );
      })
      .catch((error)=>{
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudo preparar el QR.");
        }
      });

    return ()=>{active=false};
  },[]);

  const link=useMemo(()=>{
    if(!business || !origin) return "";
    return buildBusinessDeepLink(origin,business.slug);
  },[business,origin]);

  const svg=useMemo(()=>{
    if(!link || business?.status!=="active") return "";
    return makeQrSvg(link);
  },[link,business?.status]);

  async function copyLink(){
    if(!link) return;
    await navigator.clipboard.writeText(link);
    setStatus("Enlace copiado.");
  }

  function downloadSvg(){
    if(!svg || !business) return;

    const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download="navibori-"+business.slug+"-qr.svg";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("QR SVG preparado.");
  }

  function printCard(){
    if(!svg || !business || !link) return;

    const popup=window.open("","_blank","width=520,height=720");
    if(!popup){
      setStatus("El navegador bloqueó la ventana de impresión.");
      return;
    }

    const doc=popup.document;
    doc.title="NAVIBORI QR · "+business.name;

    const style=doc.createElement("style");
    style.textContent=`
      body{font-family:Arial,sans-serif;margin:0;padding:36px;color:#10252d;background:#fff}
      main{max-width:420px;margin:auto;border:1px solid #dfe7ea;border-radius:24px;padding:28px;text-align:center}
      .brand{font-size:12px;font-weight:800;letter-spacing:.16em;color:#005f8f}
      h1{font-size:26px;margin:10px 0 6px}
      p{color:#637780;font-size:13px;line-height:1.5}
      .qr{max-width:290px;margin:22px auto}
      .qr svg{width:100%;height:auto}
      .url{font-size:10px;word-break:break-all;color:#637780}
      @media print{body{padding:0}main{border:0}}
    `;
    doc.head.appendChild(style);

    const main=doc.createElement("main");
    const brand=doc.createElement("div");
    brand.className="brand";
    brand.textContent="NAVIBORI XR";
    main.appendChild(brand);

    const title=doc.createElement("h1");
    title.textContent=business.name;
    main.appendChild(title);

    const prompt=doc.createElement("p");
    prompt.textContent="Escanea para abrir el perfil oficial del comercio en NAVIBORI.";
    main.appendChild(prompt);

    const qrWrap=doc.createElement("div");
    qrWrap.className="qr";
    qrWrap.innerHTML=svg;
    main.appendChild(qrWrap);

    const urlText=doc.createElement("div");
    urlText.className="url";
    urlText.textContent=link;
    main.appendChild(urlText);

    doc.body.appendChild(main);
    popup.focus();
    popup.print();
  }

  const ready=Boolean(svg && business?.status==="active");

  return (
    <section className="merchant-qr-kit">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">QR SHARE KIT</p>
          <h2>QR del comercio</h2>
          <small>Generado localmente en tu navegador.</small>
        </div>
        {business && (
          <span className={"commerce-lifecycle "+business.status}>
            {business.status}
          </span>
        )}
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      {ready && business ? (
        <div className="merchant-qr-layout">
          <div
            className="merchant-qr-code"
            aria-label={"Código QR para "+business.name}
            dangerouslySetInnerHTML={{__html:svg}}
          />

          <div className="merchant-qr-details">
            <strong>{business.name}</strong>
            <code>{link}</code>
            <p>
              El QR abre directamente el perfil canónico publicado. No utiliza APIs QR externas.
            </p>

            <div className="merchant-actions">
              <button type="button" onClick={copyLink}>Copiar enlace</button>
              <button type="button" onClick={downloadSvg}>Descargar SVG</button>
              <button type="button" onClick={printCard}>Imprimir ficha</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="merchant-empty">
          Activa el comercio mediante Commerce Review para habilitar su QR público.
        </div>
      )}
    </section>
  );
}
