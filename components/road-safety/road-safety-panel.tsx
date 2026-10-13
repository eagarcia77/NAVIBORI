"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";
import {
  ROAD_ALERTS_STORAGE_KEY,
  REPORT_TTL_MS,
  nearbyAlerts,
  metersBetween,
  validReport,
  type Fix,
  type RoadAlert,
  type RoadAlertKind
} from "@/lib/road-safety/proximity";
import styles from "./road-safety-panel.module.css";

type Lang="es"|"en";
type GpsStatus="idle"|"searching"|"active"|"error";
type LocationFix=Fix & {receivedAt:number;speedMps:number|null};

const initialCenter:[number,number]=[-66.506,18.052];
const mapStyle:maplibregl.StyleSpecification={
  version:8,
  sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,
    attribution:"© OpenStreetMap contributors"}},
  layers:[{id:"road-alerts-osm",type:"raster",source:"osm"}]
};

const copy={
  es:{
    title:"Alertas viales",sub:"Navegación preventiva con ubicación GPS",
    home:"Volver al mapa",start:"Activar GPS",stop:"Detener GPS",
    searching:"Buscando ubicación…",active:"GPS activo",idle:"GPS desactivado",
    unavailable:"No se pudo obtener la ubicación. Verifica los permisos y la señal GPS.",
    unsupported:"Este dispositivo o navegador no permite geolocalización.",
    secure:"La localización requiere HTTPS o localhost.",
    camera:"Cámara de velocidad (reportada)",
    check:"Control de velocidad (reportado)",hazard:"Peligro en la vía",
    add:"Reportar aquí",nearby:"Avisos cercanos",none:"Sin avisos dentro de 3 km.",
    all:"Guardados en este dispositivo",save:"Marcar ubicación",delete:"Eliminar",
    off:"Voz desactivada",on:"Voz activada",follow:"Centrar mapa",
    accuracy:"Precisión GPS",speed:"Velocidad GPS",
    safe:"Para reportar debes estar detenido y tener una ubicación precisa (≤125 m).",
    local:"Estos reportes son privados de este dispositivo: todavía NO se comparten con otros usuarios.",
    limitation:"Avisos basados en GPS y reportes. El teléfono NO detecta directamente señales de radar K/Ka ni láser.",
    confirmation:"Reporte local guardado; no verificado.",duplicate:"Ya existe un reporte cercano de ese tipo.",
    ahead:"más adelante",meters:"m",kilometers:"km",last:"Sin señal",expires:"Caduca",
    private:"Tu GPS no se envía al servidor en este prototipo.",
    disclaimer:"Los reportes pueden ser incompletos o incorrectos. Respeta siempre los límites de velocidad."
  },
  en:{
    title:"Road safety alerts",sub:"GPS-based driver awareness",
    home:"Back to map",start:"Enable GPS",stop:"Stop GPS",
    searching:"Acquiring location…",active:"GPS active",idle:"GPS inactive",
    unavailable:"Location unavailable. Check your permissions and GPS signal.",
    unsupported:"This browser or device does not support geolocation.",
    secure:"Location requires HTTPS or localhost.",
    camera:"Speed camera (reported)",
    check:"Speed enforcement area (reported)",hazard:"Road hazard",
    add:"Report here",nearby:"Nearby alerts",none:"No alerts within 3 km.",
    all:"Saved on this device",save:"Save location",delete:"Delete",
    off:"Voice off",on:"Voice on",follow:"Center map",
    accuracy:"GPS accuracy",speed:"GPS speed",
    safe:"Reporting is available only while stationary with accurate GPS (≤125 m).",
    local:"Reports are private to this device: they are NOT yet shared with other users.",
    limitation:"GPS and user-report based. Your phone does NOT receive K/Ka police radar or laser signals.",
    confirmation:"Local unverified report saved.",duplicate:"A nearby alert of this type already exists.",
    ahead:"ahead",meters:"m",kilometers:"km",last:"No signal",expires:"Expires",
    private:"Your GPS is not transmitted to a server in this prototype.",
    disclaimer:"Reports can be incomplete or incorrect. Always follow posted speed limits."
  }
};

function iconFor(kind:RoadAlertKind){
  return kind==="speed-camera"?"📷":kind==="speed-check"?"⚠️":"🚧";
}
function readableDistance(distance:number,lang:Lang){
  return distance<1000?`${Math.round(distance)} m`:`${(distance/1000).toFixed(1)} ${lang==="en"?"km":"km"}`;
}
function reportLabel(kind:RoadAlertKind,lang:Lang){
  return kind==="speed-camera"?copy[lang].camera:kind==="speed-check"?copy[lang].check:copy[lang].hazard;
}

export default function RoadSafetyPanel(){
  const [lang,setLang]=useState<Lang>("es");
  const [gpsStatus,setGpsStatus]=useState<GpsStatus>("idle");
  const [gpsError,setGpsError]=useState("");
  const [fix,setFix]=useState<LocationFix|null>(null);
  const [reports,setReports]=useState<RoadAlert[]>([]);
  const [hydrated,setHydrated]=useState(false);
  const [voice,setVoice]=useState(false);
  const [follow,setFollow]=useState(true);
  const [notice,setNotice]=useState("");
  const mapContainer=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<maplibregl.Map|null>(null);
  const userMarker=useRef<maplibregl.Marker|null>(null);
  const reportMarkers=useRef<maplibregl.Marker[]>([]);
  const gpsWatchRef=useRef<number|null>(null);
  const lastSpoken=useRef<Map<string,number>>(new Map());
  const lastFix=useRef<LocationFix|null>(null);

  const t=copy[lang];
  const nearby=useMemo(()=>fix?nearbyAlerts(fix,reports):[],[fix,reports]);
  const safeToReport=Boolean(fix && Date.now()-fix.receivedAt<30000 &&
    (fix.accuracy ?? Infinity)<=125 && (fix.speedMps===null || fix.speedMps<2.5));

  useEffect(()=>{
    setLang(navigator.language.toLowerCase().startsWith("en")?"en":"es");
    try{
      const saved=JSON.parse(localStorage.getItem(ROAD_ALERTS_STORAGE_KEY)||"[]");
      if(Array.isArray(saved))setReports(saved.filter((a)=>validReport(a)).slice(-100));
    }catch{
      setReports([]);
    }finally{
      setHydrated(true);
    }
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(ROAD_ALERTS_STORAGE_KEY,JSON.stringify(reports));}catch{}
  },[reports,hydrated]);

  useEffect(()=>{
    if(!mapContainer.current)return;
    const map=new maplibregl.Map({
      container:mapContainer.current,
      style:mapStyle,
      center:initialCenter,
      zoom:13,
      attributionControl:false
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:true}),"top-right");
    map.on("dragstart",()=>setFollow(false));
    map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
    mapRef.current=map;
    return ()=>{
      reportMarkers.current.forEach(marker=>marker.remove());
      reportMarkers.current=[];
      userMarker.current?.remove();
      userMarker.current=null;
      mapRef.current=null;
      map.remove();
    };
  },[]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    reportMarkers.current.forEach(marker=>marker.remove());
    reportMarkers.current=reports.filter(report=>validReport(report)).map(report=>{
      const pin=document.createElement("span");
      pin.className=styles.reportPin;
      pin.textContent=iconFor(report.kind);
      pin.title=reportLabel(report.kind,lang);
      pin.setAttribute("aria-label",reportLabel(report.kind,lang));
      return new maplibregl.Marker({element:pin,anchor:"bottom"})
        .setLngLat([report.longitude,report.latitude])
        .addTo(map);
    });
  },[reports,lang]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!fix)return;
    if(!userMarker.current){
      const marker=document.createElement("span");
      marker.className=styles.youPin;
      marker.title="GPS";
      userMarker.current=new maplibregl.Marker({element:marker}).setLngLat([fix.longitude,fix.latitude]).addTo(map);
    }else{
      userMarker.current.setLngLat([fix.longitude,fix.latitude]);
    }
    if(follow)map.easeTo({center:[fix.longitude,fix.latitude],zoom:Math.max(14,map.getZoom()),duration:450});
  },[fix,follow]);

  useEffect(()=>{
    if(!voice || !fix || !("speechSynthesis" in window))return;
    const candidate=nearby.find(item=>item.ahead && item.distanceMeters<=600);
    if(!candidate)return;
    const now=Date.now();
    if((lastSpoken.current.get(candidate.alert.id)||0)+5*60*1000>now)return;
    lastSpoken.current.set(candidate.alert.id,now);
    const msg=lang==="en"
      ? `Caution. ${reportLabel(candidate.alert.kind,lang)} about ${Math.round(candidate.distanceMeters/50)*50} meters ahead. Follow the speed limit.`
      : `Precaución. ${reportLabel(candidate.alert.kind,lang)} a unos ${Math.round(candidate.distanceMeters/50)*50} metros. Respeta el límite de velocidad.`;
    const voiceMessage=new SpeechSynthesisUtterance(msg);
    voiceMessage.lang=lang==="en"?"en-US":"es-US";
    voiceMessage.rate=0.95;
    window.speechSynthesis.speak(voiceMessage);
  },[nearby,fix,lang,voice]);

  const stopGps=useCallback(()=>{
    if(gpsWatchRef.current!==null && "geolocation" in navigator){
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }
    gpsWatchRef.current=null;
    setGpsStatus("idle");
    setFix(null);
    lastFix.current=null;
  },[]);

  useEffect(()=>()=>{if(gpsWatchRef.current!==null)navigator.geolocation.clearWatch(gpsWatchRef.current);},[]);

  function startGps(){
    if(typeof window==="undefined")return;
    if(!window.isSecureContext){setGpsError(t.secure);setGpsStatus("error");return;}
    if(!("geolocation" in navigator)){setGpsError(t.unsupported);setGpsStatus("error");return;}
    if(gpsWatchRef.current!==null)return;
    setGpsStatus("searching");
    setGpsError("");
    gpsWatchRef.current=navigator.geolocation.watchPosition(
      position=>{
        const coords=position.coords;
        const next:LocationFix={
          latitude:coords.latitude,longitude:coords.longitude,
          heading:coords.heading,accuracy:coords.accuracy,
          speedMps:coords.speed,receivedAt:Date.now()
        };
        // Reject clearly inaccurate fixes instead of portraying them as reliable radar proximity.
        if(coords.accuracy>2000){setGpsError(t.unavailable);return;}
        lastFix.current=next;
        setFix(next);
        setGpsStatus("active");
        setGpsError("");
      },
      ()=>{setGpsError(t.unavailable);setGpsStatus("error");},
      {enableHighAccuracy:true,maximumAge:4000,timeout:20000}
    );
  }

  function saveReport(kind:RoadAlertKind){
    const current=lastFix.current;
    const now=Date.now();
    if(!current || now-current.receivedAt>30000 || (current.accuracy??Infinity)>125 ||
      (current.speedMps!==null && current.speedMps>=2.5)){setNotice(t.safe);return;}
    const duplicate=reports.some(report=>report.kind===kind&&validReport(report,now)&&
      metersBetween(current,report)<45);
    if(duplicate){setNotice(t.duplicate);return;}
    const next:RoadAlert={
      id:crypto.randomUUID(),kind,
      latitude:current.latitude,longitude:current.longitude,
      createdAt:now,expiresAt:now+REPORT_TTL_MS[kind],source:"local"
    };
    setReports(old=>[...old.filter(item=>validReport(item,now)).slice(-99),next]);
    setNotice(t.confirmation);
  }

  function removeReport(id:string){
    if(fix?.speedMps != null && fix.speedMps>=2.5){setNotice(t.safe);return;}
    setReports(previous=>previous.filter(item=>item.id!==id));
  }

  function centerMap(){
    if(!fix)return;
    setFollow(true);
    mapRef.current?.easeTo({center:[fix.longitude,fix.latitude],zoom:16,duration:350});
  }

  return (
    <section className={styles.shell} aria-label={t.title}>
      <header className={styles.header}>
        <div>
          <div className={styles.brand}>NAVIBORI <b>ROAD AWARE</b></div>
          <h1>{t.title}</h1>
          <p>{t.sub}</p>
        </div>
        <a className={styles.back} href="/">{t.home} ↗</a>
      </header>

      <div className={styles.layout}>
        <div className={styles.mapCard}>
          <div className={styles.map} ref={mapContainer} aria-label={lang==="en"?"Road safety map":"Mapa de alertas viales"}/>
          <div className={styles.statusBar}>
            <span className={gpsStatus==="active"?styles.connected:styles.disconnected}>
              ● {gpsStatus==="active"?t.active:gpsStatus==="searching"?t.searching:t.idle}
            </span>
            {fix&&<><span>{t.accuracy}: ±{Math.round(fix.accuracy??0)} m</span>
              <span>{t.speed}: {fix.speedMps==null?"—":(fix.speedMps*3.6).toFixed(0)+" km/h"}</span></>}
          </div>
          <div className={styles.mapActions}>
            {gpsWatchRef.current!==null
              ?<button onClick={stopGps} type="button">{t.stop}</button>
              :<button onClick={startGps} type="button" className={styles.primary}>{t.start}</button>}
            <button type="button" onClick={()=>setVoice(v=>!v)} aria-pressed={voice}>
              {voice?"🔊 "+t.on:"🔇 "+t.off}
            </button>
            <button type="button" onClick={centerMap} disabled={!fix}>{t.follow}</button>
          </div>
          {gpsError&&<p className={styles.warning} role="alert">{gpsError}</p>}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <div className={styles.headingRow}><h2>{t.nearby}</h2><span>{nearby.length}</span></div>
            {nearby.length===0?<p className={styles.empty}>{t.none}</p>:(
              <ul className={styles.list}>
                {nearby.slice(0,12).map(item=>(
                  <li key={item.alert.id} className={styles.alertRow}>
                    <span className={styles.emoji} aria-hidden="true">{iconFor(item.alert.kind)}</span>
                    <span className={styles.alertText}>
                      <b>{reportLabel(item.alert.kind,lang)}</b>
                      <small>{readableDistance(item.distanceMeters,lang)}{item.ahead?" · "+t.ahead:""} · {new Date(item.alert.expiresAt).toLocaleString(lang==="en"?"en-US":"es-PR")}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.card}>
            <h2>{t.add}</h2>
            <p className={styles.help}>{t.safe}</p>
            <div className={styles.reportButtons}>
              {(["speed-camera","speed-check","road-hazard"] as RoadAlertKind[]).map(kind=>(
                <button key={kind} disabled={!safeToReport} type="button" onClick={()=>saveReport(kind)}>
                  {iconFor(kind)} {reportLabel(kind,lang)}
                </button>
              ))}
            </div>
            {notice&&<p className={styles.notice} role="status">{notice}</p>}
          </div>

          <div className={styles.card}>
            <div className={styles.headingRow}><h2>{t.all}</h2><span>{reports.length}</span></div>
            <p className={styles.help}>{t.local}</p>
            <ul className={styles.savedList}>
              {reports.slice().reverse().slice(0,10).map(report=>(
                <li key={report.id}>
                  <span>{iconFor(report.kind)} {reportLabel(report.kind,lang)}</span>
                  <button onClick={()=>removeReport(report.id)} type="button" disabled={Boolean(fix?.speedMps!=null&&fix.speedMps>=2.5)}>{t.delete}</button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <div className={styles.footnotes}>
        <p><strong>{t.limitation}</strong></p>
        <p>{t.private} {t.disclaimer}</p>
      </div>
    </section>
  );
}
