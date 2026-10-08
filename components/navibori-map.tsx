"use client";

import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";
import RealityIntensityControl from "@/components/cockpit/reality-intensity";
import XenoSignalStrip from "@/components/cockpit/xeno-signal-strip";
import {
  buildGoogleDirectionsUrl,
  validRouteCoordinate,
  type RouteCoordinate
} from "@/lib/commerce/directions";
import type {
  InMapRouteMode,
  InMapRouteResult
} from "@/lib/commerce/in-map-routing";
import type {CommerceCategory,CommerceProfile} from "@/lib/commerce/types";

const JUANA_DIAZ_REFERENCE:[number,number]=[-66.506,18.052];
const ROUTE_SOURCE_ID="navibori-commerce-route";
const ROUTE_CASING_ID="navibori-commerce-route-casing";
const ROUTE_LINE_ID="navibori-commerce-route-line";

type RealityMode="2d"|"globe"|"time";
type MapCategory="all"|CommerceCategory;

const categories:Array<{value:MapCategory;label:string}>=[
  {value:"all",label:"Todos"},
  {value:"gastronomia",label:"Gastronomía"},
  {value:"compras",label:"Compras"},
  {value:"artesania",label:"Artesanía"},
  {value:"servicios",label:"Servicios"},
  {value:"bienestar",label:"Bienestar"}
];

function formatDistance(meters:number){
  if(meters<1000){
    return Math.max(1,Math.round(meters*3.28084))+" ft";
  }

  return (meters/1609.344).toFixed(1)+" mi · "+(meters/1000).toFixed(1)+" km";
}

function formatDuration(seconds:number){
  const minutes=Math.max(1,Math.round(seconds/60));
  if(minutes<60) return minutes+" min";

  const hours=Math.floor(minutes/60);
  const remainder=minutes%60;
  return hours+" h"+(remainder ? " "+remainder+" min" : "");
}

export default function NaviboriMap({
  businesses,
  source
}:{
  businesses:CommerceProfile[];
  source:"live"|"demo";
}){
  const mapNode=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<maplibregl.Map|null>(null);
  const markersRef=useRef<maplibregl.Marker[]>([]);
  const userMarkerRef=useRef<maplibregl.Marker|null>(null);
  const routeAbortRef=useRef<AbortController|null>(null);

  const [mapReady,setMapReady]=useState(false);
  const [mode,setMode]=useState<RealityMode>("2d");
  const [timeOpen,setTimeOpen]=useState(false);
  const [basemapState,setBasemapState]=useState<"loading"|"ready"|"error">("loading");
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const [category,setCategory]=useState<MapCategory>("all");
  const [userLocation,setUserLocation]=useState<RouteCoordinate|null>(null);
  const [locationStatus,setLocationStatus]=useState("");
  const [routeResult,setRouteResult]=useState<InMapRouteResult|null>(null);
  const [routeStatus,setRouteStatus]=useState("");
  const [routeBusy,setRouteBusy]=useState<InMapRouteMode|null>(null);
  const [lastRouteMode,setLastRouteMode]=useState<InMapRouteMode>("driving");

  const mappedBusinesses=useMemo(
    ()=>businesses.filter((business)=>
      business.mapLocation &&
      validRouteCoordinate(business.mapLocation) &&
      (category==="all" || business.category===category)
    ),
    [businesses,category]
  );

  const selected=useMemo(
    ()=>businesses.find((business)=>business.slug===selectedSlug) ?? null,
    [businesses,selectedSlug]
  );

  const canRoute=Boolean(
    selected?.verifiedLocation &&
    selected.mapLocation &&
    selected.mapLocation.verified
  );

  useEffect(()=>{
    if(typeof window!=="undefined"){
      const params=new URLSearchParams(window.location.search);
      setSelectedSlug(params.get("business"));
    }

    if(!mapNode.current || mapRef.current) return;

    const map=new maplibregl.Map({
      container:mapNode.current,
      style:{
        version:8,
        sources:{
          osm:{
            type:"raster",
            tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize:256,
            attribution:"© OpenStreetMap contributors"
          }
        },
        layers:[{
          id:"osm-raster",
          type:"raster",
          source:"osm",
          minzoom:0,
          maxzoom:20
        }]
      },
      center:JUANA_DIAZ_REFERENCE,
      zoom:14,
      canvasContextAttributes:{antialias:true}
    });

    map.on("load",()=>{
      setBasemapState("ready");
      setMapReady(true);
    });
    map.on("error",(event)=>{
      if(event?.error) setBasemapState("error");
    });

    map.addControl(new maplibregl.NavigationControl({showCompass:true}),"top-right");
    if("GlobeControl" in maplibregl){
      map.addControl(new maplibregl.GlobeControl(),"top-right");
    }

    mapRef.current=map;
    return ()=>{
      routeAbortRef.current?.abort();
      markersRef.current.forEach((marker)=>marker.remove());
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current=null;
    };
  },[]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map || !mapReady) return;

    markersRef.current.forEach((marker)=>marker.remove());
    markersRef.current=[];

    const bounds=new maplibregl.LngLatBounds();

    mappedBusinesses.forEach((business)=>{
      const location=business.mapLocation!;
      const element=document.createElement("button");
      element.type="button";
      element.className="business-map-marker "+(business.verifiedLocation ? "verified" : "demo");
      element.setAttribute("aria-label","Ver "+business.name+" en el mapa");
      element.title=business.name;

      const initial=document.createElement("span");
      initial.textContent=business.name.slice(0,1).toUpperCase();
      element.appendChild(initial);

      element.addEventListener("click",()=>{
        routeAbortRef.current?.abort();
        setRouteResult(null);
        setRouteStatus("");
        setSelectedSlug(business.slug);
        map.easeTo({
          center:[location.longitude,location.latitude],
          zoom:17,
          duration:650
        });
      });

      const marker=new maplibregl.Marker({element,anchor:"bottom"})
        .setLngLat([location.longitude,location.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([location.longitude,location.latitude]);
    });

    const focused=mappedBusinesses.find((business)=>business.slug===selectedSlug);
    if(focused?.mapLocation && !routeResult){
      map.easeTo({
        center:[focused.mapLocation.longitude,focused.mapLocation.latitude],
        zoom:17,
        duration:700
      });
    }else if(mappedBusinesses.length>1 && !bounds.isEmpty() && !selectedSlug){
      map.fitBounds(bounds,{padding:70,maxZoom:16,duration:700});
    }else if(mappedBusinesses.length===1 && !selectedSlug){
      const location=mappedBusinesses[0].mapLocation!;
      map.easeTo({center:[location.longitude,location.latitude],zoom:16,duration:700});
    }
  },[mappedBusinesses,mapReady,routeResult,selectedSlug]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map || !mapReady) return;

    const empty={
      type:"FeatureCollection" as const,
      features:[]
    };

    if(!routeResult){
      const source=map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;
      source?.setData(empty);
      return;
    }

    const feature={
      type:"Feature" as const,
      properties:{mode:routeResult.mode},
      geometry:routeResult.geometry
    };

    const existing=map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;

    if(existing){
      existing.setData(feature);
    }else{
      map.addSource(ROUTE_SOURCE_ID,{
        type:"geojson",
        data:feature
      });

      map.addLayer({
        id:ROUTE_CASING_ID,
        type:"line",
        source:ROUTE_SOURCE_ID,
        layout:{
          "line-cap":"round",
          "line-join":"round"
        },
        paint:{
          "line-color":"#ffffff",
          "line-width":9,
          "line-opacity":0.92
        }
      });

      map.addLayer({
        id:ROUTE_LINE_ID,
        type:"line",
        source:ROUTE_SOURCE_ID,
        layout:{
          "line-cap":"round",
          "line-join":"round"
        },
        paint:{
          "line-color":routeResult.mode==="walking" ? "#136f63" : "#2463eb",
          "line-width":5,
          "line-opacity":0.96
        }
      });
    }

    if(map.getLayer(ROUTE_LINE_ID)){
      map.setPaintProperty(
        ROUTE_LINE_ID,
        "line-color",
        routeResult.mode==="walking" ? "#136f63" : "#2463eb"
      );
      map.setPaintProperty(
        ROUTE_LINE_ID,
        "line-dasharray",
        routeResult.mode==="walking" ? [1.2,1.2] : [1,0]
      );
    }

    const bounds=new maplibregl.LngLatBounds();
    routeResult.geometry.coordinates.forEach(([longitude,latitude])=>{
      bounds.extend([longitude,latitude]);
    });

    if(!bounds.isEmpty()){
      map.fitBounds(bounds,{
        padding:{top:70,right:70,bottom:190,left:70},
        maxZoom:17,
        duration:750
      });
    }
  },[mapReady,routeResult]);

  function activateMapMode(next:RealityMode){
    const map=mapRef.current;
    if(!map) return;

    if(next==="globe"){
      map.setProjection({type:"globe"});
      map.easeTo({zoom:Math.min(map.getZoom(),8),duration:900});
    }else{
      map.setProjection({type:"mercator"});
    }

    setMode(next);
    setTimeOpen(next==="time");
  }

  function showUserLocation(next:RouteCoordinate){
    const map=mapRef.current;
    if(!map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current=new maplibregl.Marker({color:"#136f63"})
      .setLngLat([next.longitude,next.latitude])
      .addTo(map);
  }

  function locateMe(afterLocate?:(coordinate:RouteCoordinate)=>void){
    if(!navigator.geolocation){
      setLocationStatus("Este dispositivo no ofrece geolocalización.");
      return;
    }

    setLocationStatus("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (position)=>{
        const next={
          latitude:position.coords.latitude,
          longitude:position.coords.longitude
        };

        setUserLocation(next);
        setLocationStatus("Tu ubicación está activa solo durante esta sesión.");
        showUserLocation(next);

        if(afterLocate){
          afterLocate(next);
          return;
        }

        mapRef.current?.easeTo({
          center:[next.longitude,next.latitude],
          zoom:15,
          duration:650
        });
      },
      ()=>{
        setLocationStatus(
          "No se pudo acceder a tu ubicación. Puedes permitirla en el navegador o abrir Google Maps."
        );
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
    );
  }

  async function calculateRoute(
    routeMode:InMapRouteMode,
    origin:RouteCoordinate
  ){
    if(!selected?.mapLocation || !canRoute) return;

    routeAbortRef.current?.abort();
    const controller=new AbortController();
    routeAbortRef.current=controller;

    setLastRouteMode(routeMode);
    setRouteBusy(routeMode);
    setRouteStatus(
      routeMode==="walking"
        ? "Calculando ruta caminando…"
        : "Calculando ruta en carro…"
    );

    try{
      const response=await fetch("/api/routing",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          mode:routeMode,
          origin,
          destination:{
            latitude:selected.mapLocation.latitude,
            longitude:selected.mapLocation.longitude
          }
        }),
        cache:"no-store",
        signal:controller.signal
      });

      const data=await response.json() as InMapRouteResult|{error?:string};

      if(!response.ok || !("geometry" in data)){
        throw new Error("error" in data && data.error ? data.error : "No se encontró una ruta.");
      }

      setRouteResult(data);
      setRouteStatus(
        (routeMode==="walking" ? "Ruta caminando" : "Ruta en carro")+
        " · "+formatDistance(data.distanceMeters)+
        " · "+formatDuration(data.durationSeconds)
      );
    }catch(error){
      if(error instanceof Error && error.name==="AbortError") return;
      setRouteResult(null);
      setRouteStatus(
        error instanceof Error ? error.message : "No se pudo calcular la ruta."
      );
    }finally{
      if(routeAbortRef.current===controller){
        routeAbortRef.current=null;
        setRouteBusy(null);
      }
    }
  }

  function routeInsideNavibori(routeMode:InMapRouteMode){
    if(!canRoute) return;

    if(userLocation){
      void calculateRoute(routeMode,userLocation);
      return;
    }

    locateMe((coordinate)=>{
      void calculateRoute(routeMode,coordinate);
    });
  }

  function clearRoute(){
    routeAbortRef.current?.abort();
    routeAbortRef.current=null;
    setRouteResult(null);
    setRouteStatus("");
    setRouteBusy(null);
  }

  function directionUrl(routeMode:InMapRouteMode){
    if(!selected?.mapLocation) return "#";
    return buildGoogleDirectionsUrl(
      selected.mapLocation,
      routeMode,
      userLocation ?? undefined
    );
  }

  return (
    <section className="map-panel spatial-cockpit" aria-label="Mapa de comercios NAVIBORI">
      <div className="cockpit-topline">
        <div className="reality-mode-switch" role="group" aria-label="Modo de mapa">
          <button type="button" className={mode==="2d" ? "active" : ""} onClick={()=>activateMapMode("2d")}>2D</button>
          <button type="button" className={mode==="globe" ? "active" : ""} onClick={()=>activateMapMode("globe")}>Globe</button>
          <Link href="/twin">Twin</Link>
          <Link href="/ar">AR</Link>
          <button type="button" className={mode==="time" ? "active" : ""} onClick={()=>activateMapMode("time")}>Time</button>
        </div>

        <div className="cockpit-signal" aria-label="Estado del mapa">
          <span className="cockpit-pulse" aria-hidden="true" />
          <strong>{source==="live" ? "Comercios LIVE" : "Comercios DEMO"}</strong>
          <span>
            {basemapState==="ready"
              ? mappedBusinesses.length+" comercio(s) en el mapa"
              : basemapState==="error"
                ? "Mapa degradado · revisa la conexión"
                : "Cargando mapa…"}
          </span>
        </div>
      </div>

      <XenoSignalStrip />

      <div className="map-toolbar" aria-label="Categorías de comercios">
        {categories.map((item)=>(
          <button
            type="button"
            key={item.value}
            className={category===item.value ? "selected" : ""}
            onClick={()=>{
              clearRoute();
              setCategory(item.value);
            }}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={()=>locateMe()}>Mi ubicación</button>
      </div>

      <div className="map-stage">
        <div ref={mapNode} className="map-canvas" />

        {timeOpen && (
          <aside className="time-machine-panel" aria-live="polite">
            <p className="eyebrow">TEMPORAL TWIN</p>
            <strong>Time Machine · Navi Time Echo</strong>
            <span>Las rutas comerciales usan únicamente ubicaciones publicadas y verificadas.</span>
          </aside>
        )}

        <RealityIntensityControl />

        <aside className="business-route-card" aria-live="polite">
          {selected ? (
            <>
              <span className={"commerce-demo-badge "+(selected.demo ? "" : "live")}>
                {selected.demo ? "DEMO" : "LIVE"}
              </span>
              <strong>{selected.name}</strong>
              <span>{selected.mapLocation?.address ?? selected.locationLabel}</span>

              {canRoute ? (
                <>
                  <div className="business-route-mode-actions">
                    <button
                      type="button"
                      className={routeResult?.mode==="driving" ? "active" : ""}
                      disabled={routeBusy!==null}
                      onClick={()=>routeInsideNavibori("driving")}
                    >
                      {routeBusy==="driving" ? "Calculando…" : "🚗 Ruta en carro"}
                    </button>
                    <button
                      type="button"
                      className={routeResult?.mode==="walking" ? "active" : ""}
                      disabled={routeBusy!==null}
                      onClick={()=>routeInsideNavibori("walking")}
                    >
                      {routeBusy==="walking" ? "Calculando…" : "🚶 Ruta caminando"}
                    </button>
                  </div>

                  {routeResult && (
                    <div className="navibori-route-summary">
                      <div>
                        <span>Distancia</span>
                        <strong>{formatDistance(routeResult.distanceMeters)}</strong>
                      </div>
                      <div>
                        <span>Tiempo estimado</span>
                        <strong>{formatDuration(routeResult.durationSeconds)}</strong>
                      </div>
                      <div>
                        <span>Modo</span>
                        <strong>{routeResult.mode==="walking" ? "Caminando" : "En carro"}</strong>
                      </div>
                    </div>
                  )}

                  <div className="business-route-actions secondary">
                    {routeResult && (
                      <button type="button" onClick={clearRoute}>
                        Limpiar ruta
                      </button>
                    )}
                    <a
                      href={directionUrl(routeResult?.mode ?? lastRouteMode)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir en Google Maps
                    </a>
                    <Link href={"/comercios/"+selected.slug}>Ver comercio</Link>
                  </div>

                  <small>
                    La ruta se calcula dentro de NAVIBORI con datos de OpenStreetMap.
                    Para calcularla, origen y destino se envían temporalmente al servidor de routing;
                    NAVIBORI no guarda tu ubicación.
                  </small>
                  <small>
                    <a
                      href="https://www.openstreetmap.org/fixthemap"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Corregir el mapa
                    </a>
                    {" · "}
                    Las rutas peatonales dependen de los caminos y aceras registrados.
                  </small>
                </>
              ) : (
                <>
                  <div className="business-route-actions">
                    <button type="button" disabled>Ruta pendiente de verificación</button>
                    <Link href={"/comercios/"+selected.slug}>Ver comercio</Link>
                  </div>
                  <small>
                    Los puntos DEMO no generan rutas reales. Un comercio LIVE necesita dirección y coordenadas verificadas.
                  </small>
                </>
              )}
            </>
          ) : (
            <>
              <strong>Selecciona un comercio</strong>
              <span>Toca un pin para ver la dirección y trazar la ruta en carro o caminando.</span>
            </>
          )}

          {routeStatus && (
            <small className="navibori-route-status" role="status">{routeStatus}</small>
          )}
          {locationStatus && <small>{locationStatus}</small>}
        </aside>
      </div>
    </section>
  );
}
