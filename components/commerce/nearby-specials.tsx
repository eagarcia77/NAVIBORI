"use client";
import "./nearby-specials.css";
import {useEffect,useState} from "react";
import Link from "next/link";
import {nearbyPromotions,type NearbyPosition} from "@/lib/commerce/nearby-promotions";
import type {CommerceProfile} from "@/lib/commerce/types";
export default function NearbySpecials(){
  const [enabled,setEnabled]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [position,setPosition]=useState<NearbyPosition|null>(null);
  const [businesses,setBusinesses]=useState<CommerceProfile[]>([]);
  const [radius,setRadius]=useState(1000);
  const [message,setMessage]=useState("");
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;
    async function refresh(){
      if(document.visibilityState!=="visible")return;
      try{
        const response=await fetch("/api/commerce/public",{cache:"no-store"});
        if(!response.ok)throw new Error();
        const data=await response.json();
        if(alive){setBusinesses(data.businesses??[]);setMessage("");}
      }catch{if(alive){setBusinesses([]);setMessage("No se pudieron actualizar las ofertas.");}}
    }
    void refresh();
    const timer=setInterval(()=>{setClock(Date.now());void refresh();},30000);
    if(!navigator.geolocation){setMessage("Este dispositivo no permite consultar tu ubicación.");return ()=>clearInterval(timer);}
    const watch=navigator.geolocation.watchPosition(p=>{
      if(alive)setPosition({...p.coords,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp});
    },()=>{if(alive){setPosition(null);setMessage("Permite la ubicación para encontrar anuncios cercanos.");}},
    {enableHighAccuracy:true,maximumAge:15000,timeout:20000});
    return ()=>{alive=false;clearInterval(timer);navigator.geolocation.clearWatch(watch);};
  },[enabled]);
  const offers=position&&enabled?nearbyPromotions(businesses,position,radius,Math.max(clock,Date.now())):[];
  const offerKey=JSON.stringify(offers);
  useEffect(()=>{
    if(!enabled||!notifications||document.visibilityState!=="visible"||!("Notification" in window)||Notification.permission!=="granted")return;
    let alive=true;
    void(async()=>{
      const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
      await navigator.serviceWorker.ready;
      for(const offer of JSON.parse(offerKey) as ReturnType<typeof nearbyPromotions>){
        if(!alive)break;
        const key="navibori:nearby-notified:"+offer.id;
        const previous=Number(localStorage.getItem(key)??0);
        if(Date.now()-previous<86400000)continue;
        await registration.showNotification(offer.businessName+" · "+offer.title,{
          body:offer.description+" · A "+offer.distance+" m",tag:"navibori-nearby-"+offer.id,
          icon:"/brand/navibori-app-icon.webp",data:{url:offer.url}
        });
        localStorage.setItem(key,String(Date.now()));
        break;
      }
    })().catch(()=>setMessage("No se pudo mostrar el aviso. Las ofertas siguen visibles aquí."));
    return ()=>{alive=false;};
  },[enabled,notifications,offerKey]);
  async function enableNotifications(){
    if(!("Notification" in window)||!("serviceWorker" in navigator)){
      setMessage("En iPhone, añade NAVIBORI a la pantalla de inicio y ábrelo desde su icono para activar avisos.");return;
    }
    const permission=await Notification.requestPermission();
    setNotifications(permission==="granted");
    if(permission!=="granted")setMessage("Los avisos no están permitidos; puedes consultar las ofertas aquí.");
  }
  return <details className="nearby-specials" aria-label="Anuncios cercanos">
    <summary>📍 Ofertas cercanas{offers.length ? " · "+offers.length : ""}</summary>
    <section>
    <h2>Anuncios cerca de ti</h2>
    <p>Consulta ofertas verificadas según tu ubicación. La ubicación se procesa en este dispositivo.</p>
    <button type="button" onClick={()=>{setEnabled(!enabled);setPosition(null);setMessage("");}}>{enabled?"Desactivar ubicación":"Ver ofertas cercanas"}</button>
    {enabled&&<>
      <label>Distancia <select value={radius} onChange={e=>setRadius(Number(e.target.value))}>
        <option value={500}>500 metros</option><option value={1000}>1 kilómetro</option><option value={3000}>3 kilómetros</option>
      </select></label>
      <button type="button" onClick={()=>notifications?setNotifications(false):void enableNotifications()}>{notifications?"Desactivar avisos cercanos":"Activar avisos cercanos"}</button>
      <p>Los avisos de proximidad funcionan mientras NAVIBORI esté abierto. Se limita cada oferta a un aviso por día.</p>
      {!position&&<p role="status">Esperando tu ubicación…</p>}
      {position&&offers.length===0&&<p role="status">No hay ofertas verificadas en esta distancia o la ubicación aún no es precisa.</p>}
      <ul>{offers.slice(0,5).map(o=><li key={o.id}><Link href={o.url}>{o.businessName}: {o.title}</Link> · {o.distance} m</li>)}</ul>
    </>}
    {message&&<p role="status">{message}</p>}
  </section></details>;
}
