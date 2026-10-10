"use client";

import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type PushState="checking"|"unsupported"|"default"|"enabled"|"denied"|"busy"|"error";

function applicationServerKey(value:string){
  const padding="=".repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from(raw,(char)=>char.charCodeAt(0));
}

function getInstallationId(){
  const key="navibori:push-installation-id";
  const current=localStorage.getItem(key);
  if(current) return current;

  const next=crypto.randomUUID();
  localStorage.setItem(key,next);
  return next;
}

function installedStandalone(){
  if(typeof window==="undefined") return false;
  const standalone=window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorStandalone=(navigator as Navigator & {standalone?:boolean}).standalone;
  return Boolean(standalone || navigatorStandalone);
}

export default function SpecialAlertsControl(){
  const [state,setState]=useState<PushState>("checking");
  const [message,setMessage]=useState("");
  const [standalone,setStandalone]=useState(false);

  useEffect(()=>{
    let active=true;

    (async()=>{
      setStandalone(installedStandalone());

      if(
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ){
        if(active) setState("unsupported");
        return;
      }

      try{
        const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
        await navigator.serviceWorker.ready;
        const subscription=await registration.pushManager.getSubscription();

        if(!active) return;

        if(Notification.permission==="denied"){
          setState("denied");
        }else if(subscription){
          setState("enabled");
        }else{
          setState("default");
        }
      }catch{
        if(active){
          setState("error");
          setMessage("No se pudo preparar las notificaciones.");
        }
      }
    })();

    return ()=>{active=false};
  },[]);

  async function enable(){
    setState("busy");
    setMessage("");

    try{
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){
        setState(permission==="denied" ? "denied" : "default");
        setMessage(
          permission==="denied"
            ? "Las notificaciones están bloqueadas en este dispositivo."
            : "No se activaron las notificaciones."
        );
        return;
      }

      const registration=await navigator.serviceWorker.ready;
      const supabase=createClient();

      const {data:config,error:configError}=await supabase.functions.invoke(
        "push-subscribe",
        {body:{action:"config"}}
      );

      if(configError || !config?.publicKey){
        throw new Error("No se pudo obtener la configuración push.");
      }

      let subscription=await registration.pushManager.getSubscription();
      if(!subscription){
        subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:applicationServerKey(config.publicKey)
        });
      }

      const serialized=subscription.toJSON();
      const {error}=await supabase.functions.invoke(
        "push-subscribe",
        {
          body:{
            action:"subscribe",
            installationId:getInstallationId(),
            endpoint:subscription.endpoint,
            keys:serialized.keys
          }
        }
      );

      if(error) throw error;

      setState("enabled");
      setMessage("Recibirás especiales y promociones LIVE de NAVIBORI.");
    }catch(error){
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron activar las notificaciones."
      );
    }
  }

  async function disable(){
    setState("busy");
    setMessage("");

    try{
      const registration=await navigator.serviceWorker.ready;
      const subscription=await registration.pushManager.getSubscription();

      if(subscription){
        const supabase=createClient();
        await supabase.functions.invoke(
          "push-subscribe",
          {
            body:{
              action:"unsubscribe",
              installationId:getInstallationId(),
              endpoint:subscription.endpoint
            }
          }
        );
        await subscription.unsubscribe();
      }

      setState("default");
      setMessage("Los especiales quedaron desactivados en este dispositivo.");
    }catch{
      setState("error");
      setMessage("No se pudo desactivar la suscripción.");
    }
  }

  if(state==="checking" || state==="unsupported") return null;

  return (
    <aside className={"special-alert-control "+state} aria-live="polite">
      <div>
        <span>ESPECIALES</span>
        <strong>
          {state==="enabled"
            ? "🔔 Avisos activados"
            : state==="denied"
              ? "🔕 Avisos bloqueados"
              : "🔔 Recibir especiales"}
        </strong>
      </div>

      {state==="enabled" ? (
        <button type="button" onClick={disable} disabled={state==="busy"}>
          Desactivar
        </button>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={state==="busy" || state==="denied"}
        >
          {state==="busy" ? "Activando…" : "Activar"}
        </button>
      )}

      {!standalone && state!=="enabled" && (
        <small>
          En iPhone/iPad, instala NAVIBORI en la pantalla de inicio para recibir avisos push.
        </small>
      )}
      {message && <small>{message}</small>}
    </aside>
  );
}
