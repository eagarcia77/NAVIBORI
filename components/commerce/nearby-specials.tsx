"use client";
import "./nearby-specials.css";
import {useEffect,useState,useRef} from "react";
import Link from "next/link";
import {nearbyPromotions,type NearbyPosition} from "@/lib/commerce/nearby-promotions";
import {deliverNearbyOffer} from "@/lib/commerce/nearby-delivery";
import {mayNotifyNearby} from "@/lib/commerce/nearby-alert-policy";
import type {CommerceProfile} from "@/lib/commerce/types";
export default function NearbySpecials(){
  const [enabled,setEnabled]=useState(false);
  const [notifications,setNotifications]=useState(false);
  const [position,setPosition]=useState<NearbyPosition|null>(null);
  const [businesses,setBusinesses]=useState<CommerceProfile[]>([]);
  const [radius,setRadius]=useState(1000);
  const [message,setMessage]=useState("");
  const [clock,setClock]=useState(Date.now());
  const fetchedAt=useRef(0);
  const sending=useRef(false);
  const memory=useRef<Record<string,number>>({});
  useEffect(()=>{
    try{
      const saved=Number(localStorage.getItem("navibori:nearby-radius"));
      if([500,1000,3000].includes(saved))setRadius(saved);
    }catch{}
  },[]);
  useEffect(()=>{
    if(!enabled)return;
    let alive=true;
    let watch:number|null=null;
    let fetching=false;
    const controller=new AbortController();
    async function refresh(){
      if(document.visibilityState!=="visible"||fetching)return;
      fetching=true;
      try{
        const response=await fetch("/api/commerce/public",{cache:"no-store",signal:controller.signal});
        if(!response.ok)throw new Error();
        const data=await response.json();
        if(alive){fetchedAt.current=Date.now();setBusinesses(data.businesses??[]);}
      }catch{if(alive){setBusinesses([]);setMessage("No se pudieron actualizar las ofertas.");}}
      finally{fetching=false;}
    }
    function stopLocation(){
      if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null;}
    }
    function visible(){
      if(document.visibilityState!=="visible"){stopLocation();setPosition(null);return;}
      if(!navigator.geolocation){setMessage("Este dispositivo no permite consultar tu ubicación.");return;}
      if(watch===null)watch=navigator.geolocation.watchPosition(p=>{
        if(alive){
          setPosition({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp});
          setClock(Date.now());setMessage("");
        }
      },()=>{if(alive){setPosition(null);setMessage("Permite la ubicación para encontrar anuncios cercanos.");}},
      {enableHighAccuracy:true,maximumAge:15000,timeout:20000});
      void refresh();
    }
    visible();
    document.addEventListener("visibilitychange",visible);
    const timer=setInterval(()=>{if(document.visibilityState==="visible"){setClock(Date.now());void refresh();}},30000);
    return ()=>{alive=false;controller.abort();clearInterval(timer);stopLocation();document.removeEventListener("visibilitychange",visible);};
  },[enabled]);
  const offers=position&&enabled?nearbyPromotions(businesses,position,radius,Math.max(clock,Date.now())):[];
  const offerKey=JSON.stringify(offers);
  useEffect(()=>{
    if(!enabled||!notifications||document.visibilityState!=="visible"||!("Notification" in window)||Notification.permission!=="granted")return;
    let alive=true;
    let ownsDelivery=false;
    void(async()=>{
      const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
      await deliverNearbyOffer({
        ready:()=>navigator.serviceWorker.ready,
        allowed:()=>alive&&!sending.current&&document.visibilityState==="visible"&&
          Notification.permission==="granted"&&Date.now()-fetchedAt.current<60000,
        offers:()=>position?nearbyPromotions(businesses,position,radius,Date.now()):[],
        eligible:offer=>{
          const key="navibori:nearby-notified:"+offer.id;
          const deviceKey="navibori:nearby-last-alert";
          let previous=memory.current[key]??0;
          let lastDevice=memory.current[deviceKey]??0;
          try{previous=Number(localStorage.getItem(key)??previous);lastDevice=Number(localStorage.getItem(deviceKey)??lastDevice);}catch{}
          return mayNotifyNearby(Date.now(),previous,lastDevice);
        },
        show:async offer=>{
          sending.current=true;ownsDelivery=true;
          await registration.showNotification(offer.businessName+" · "+offer.title,{
            body:offer.description+" · A "+offer.distance+" m",tag:"navibori-nearby-"+offer.id,
            icon:"/brand/navibori-app-icon.webp",data:{url:offer.url}
          });
        },
        record:offer=>{
          const key="navibori:nearby-notified:"+offer.id;
          const deviceKey="navibori:nearby-last-alert";
          const time=Date.now();memory.current[key]=time;memory.current[deviceKey]=time;
          try{localStorage.setItem(key,String(time));localStorage.setItem(deviceKey,String(time));}catch{}
        }
      });
    })().catch(()=>{if(alive)setMessage("No se pudo mostrar el aviso. Las ofertas siguen visibles aquí.");})
      .finally(()=>{if(ownsDelivery)sending.current=false;});
    return ()=>{alive=false;};
  },[enabled,notifications,offerKey,businesses,position,radius]);
  async function enableNotifications(){
    if(!("Notification" in window)||!("serviceWorker" in navigator)){
      setMessage("En iPhone, añade NAVIBORI a la pantalla de inicio y ábrelo desde su icono para activar avisos.");return;
    }
    try{
      const permission=await Notification.requestPermission();
      setNotifications(permission==="granted");
      setMessage(permission==="granted"?"Avisos cercanos activados mientras la aplicación esté abierta.":"Los avisos no están permitidos; puedes consultar las ofertas aquí.");
    }catch{setNotifications(false);setMessage("No se pudo solicitar el permiso. Verifica los ajustes del navegador.");}
  }
  return <details className="nearby-specials" aria-label="Anuncios cercanos">
    <summary>📍 Ofertas cercanas{offers.length ? " · "+offers.length : ""}</summary>
    <section>
    <h2>Anuncios cerca de ti</h2>
    <p>Consulta ofertas verificadas según tu ubicación. La ubicación se procesa en este dispositivo.</p>
    <button type="button" onClick={()=>{setEnabled(!enabled);setPosition(null);setMessage("");}}>{enabled?"Desactivar ubicación":"Ver ofertas cercanas"}</button>
    {enabled&&<>
      <label>Distancia <select value={radius} onChange={e=>{const value=Number(e.target.value);setRadius(value);try{localStorage.setItem("navibori:nearby-radius",String(value));}catch{}}}>
        <option value={500}>500 metros</option><option value={1000}>1 kilómetro</option><option value={3000}>3 kilómetros</option>
      </select></label>
      <button type="button" onClick={()=>notifications?setNotifications(false):void enableNotifications()}>{notifications?"Desactivar avisos cercanos":"Activar avisos cercanos"}</button>
      <p>Los avisos de proximidad funcionan mientras NAVIBORI esté abierto. Cada oferta avisa una vez al día, con al menos 10 minutos entre avisos.</p>
      {!position&&<p role="status">Esperando tu ubicación…</p>}
      {position&&offers.length===0&&<p role="status">No hay ofertas verificadas en esta distancia o la ubicación aún no es precisa.</p>}
      <ul>{offers.slice(0,5).map(o=><li key={o.id}><Link href={o.url}>{o.businessName}: {o.title}</Link> · {o.distance} m</li>)}</ul>
    </>}
    {message&&<p role="status">{message}</p>}
  </section></details>;
}
