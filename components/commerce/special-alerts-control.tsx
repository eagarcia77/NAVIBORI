"use client";

import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {
  NAVIBORI_LOCALE_CHANGE_EVENT,
  browserNaviboriLocale
} from "@/lib/i18n/device-locale";

type PushState="checking"|"unsupported"|"default"|"enabled"|"denied"|"error";

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
  const [busy,setBusy]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [message,setMessage]=useState("");
  const [standalone,setStandalone]=useState(false);
  const [language,setLanguage]=useState<"es"|"en">("es");

  useEffect(()=>{
    const syncLanguage=()=>{
      setLanguage(browserNaviboriLocale().language);
    };

    syncLanguage();
    window.addEventListener("languagechange",syncLanguage);
    window.addEventListener(NAVIBORI_LOCALE_CHANGE_EVENT,syncLanguage);

    return ()=>{
      window.removeEventListener("languagechange",syncLanguage);
      window.removeEventListener(NAVIBORI_LOCALE_CHANGE_EVENT,syncLanguage);
    };
  },[]);

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
          setMessage(
            language==="en"
              ? "Notifications could not be prepared."
              : "No se pudo preparar las notificaciones."
          );
        }
      }
    })();

    return ()=>{active=false};
  },[]);

  async function enable(){
    setBusy(true);
    setMessage("");

    try{
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){
        setState(permission==="denied" ? "denied" : "default");
        setMessage(
          permission==="denied"
            ? language==="en"
              ? "Notifications are blocked on this device."
              : "Las notificaciones están bloqueadas en este dispositivo."
            : language==="en"
              ? "Notifications were not enabled."
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
        throw new Error(
          language==="en"
            ? "Push configuration could not be loaded."
            : "No se pudo obtener la configuración push."
        );
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
      setMessage(
        language==="en"
          ? "You will receive NAVIBORI LIVE specials and promotions."
          : "Recibirás especiales y promociones LIVE de NAVIBORI."
      );
    }catch(error){
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : language==="en"
            ? "Notifications could not be enabled."
            : "No se pudieron activar las notificaciones."
      );
    }finally{
      setBusy(false);
    }
  }

  async function disable(){
    setBusy(true);
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
      setMessage(
        language==="en"
          ? "Special alerts were disabled on this device."
          : "Los especiales quedaron desactivados en este dispositivo."
      );
    }catch{
      setState("error");
      setMessage(
        language==="en"
          ? "The subscription could not be disabled."
          : "No se pudo desactivar la suscripción."
      );
    }finally{
      setBusy(false);
    }
  }

  if(state==="checking" || state==="unsupported") return null;

  return (
    <aside className={"special-alert-control "+state+(expanded ? " expanded" : " collapsed")} aria-live="polite">
      <div>
        <span>{language==="en" ? "SPECIALS" : "ESPECIALES"}</span>
        <strong>
          {state==="enabled"
            ? language==="en" ? "🔔 Alerts enabled" : "🔔 Avisos activados"
            : state==="denied"
              ? language==="en" ? "🔕 Alerts blocked" : "🔕 Avisos bloqueados"
              : language==="en" ? "🔔 Receive specials" : "🔔 Recibir especiales"}
        </strong>
      </div>

      <button type="button" className="special-alert-toggle" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-label={language==="en" ? "Show or hide special alert settings" : "Mostrar u ocultar ajustes de especiales"}>{expanded ? "−" : "⚙"}</button>
      {expanded && (state==="enabled" ? (
        <button type="button" onClick={disable} disabled={busy}>
          {busy
            ? language==="en" ? "Disabling…" : "Desactivando…"
            : language==="en" ? "Disable" : "Desactivar"}
        </button>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy || state==="denied"}
        >
          {busy
            ? language==="en" ? "Enabling…" : "Activando…"
            : language==="en" ? "Enable" : "Activar"}
        </button>
      ))}

      {expanded && !standalone && state!=="enabled" && (
        <small>
          {language==="en"
            ? "On iPhone/iPad, install NAVIBORI on the Home Screen to receive push alerts."
            : "En iPhone/iPad, instala NAVIBORI en la pantalla de inicio para recibir avisos push."}
        </small>
      )}
      {expanded && message && <small>{message}</small>}
    </aside>
  );
}
