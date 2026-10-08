"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import RealityIntensityControl from "@/components/cockpit/reality-intensity";
import XenoSignalStrip from "@/components/cockpit/xeno-signal-strip";
import {buildGoogleDirectionsUrl,validRouteCoordinate,type RouteCoordinate} from "@/lib/commerce/directions";
import type {CommerceCategory,CommerceProfile} from "@/lib/commerce/types";

const JUANA_DIAZ_REFERENCE:[number,number]=[-66.506,18.052];
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
  const [mapReady,setMapReady]=useState(false);
  const [mode,setMode]=useState<RealityMode>("2d");
  const [timeOpen,setTimeOpen]=useState(false);
  const [basemapState,setBasemapState]=useState<"loading"|"ready"|"error">("loading");
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const [category,setCategory]=useState<MapCategory>("all");
  const [userLocation,setUserLocation]=useState<RouteCoordinate|null>(null);
  const [locationStatus,setLocationStatus]=useState("");

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
      element.innerHTML="<span>"+business.name.slice(0,1).toUpperCase()+"</span>";
      element.addEventListener("click",()=>{
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
    if(focused?.mapLocation){
      map.easeTo({
        center:[focused.mapLocation.longitude,focused.mapLocation.latitude],
        zoom:17,
        duration:700
      });
    }else if(mappedBusinesses.length>1 && !bounds.isEmpty()){
      map.fitBounds(bounds,{padding:70,maxZoom:16,duration:700});
    }else if(mappedBusinesses.length===1){
      const location=mappedBusinesses[0].mapLocation!;
      map.easeTo({center:[location.longitude,location.latitude],zoom:16,duration:700});
    }
  },[mappedBusinesses,mapReady,selectedSlug]);

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

  function locateMe(){
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
        setLocationStatus("Tu ubicación está activa solo para esta sesión.");

        const map=mapRef.current;
        if(!map) return;

        userMarkerRef.current?.remove();
        userMarkerRef.current=new maplibregl.Marker({color:"#136f63"})
          .setLngLat([next.longitude,next.latitude])
          .addTo(map);
        map.easeTo({center:[next.longitude,next.latitude],zoom:15,duration:650});
      },
      ()=>{
        setLocationStatus("No se pudo acceder a tu ubicación. Puedes abrir la ruta y elegir el origen en Google Maps.");
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
    );
  }

  const canRoute=Boolean(
    selected?.verifiedLocation &&
    selected.mapLocation &&
    selected.mapLocation.verified
  );

  function directionUrl(mode:"driving"|"walking"){
    if(!selected?.mapLocation) return "#";
    return buildGoogleDirectionsUrl(selected.mapLocation,mode,userLocation ?? undefined);
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
            onClick={()=>setCategory(item.value)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={locateMe}>Mi ubicación</button>
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

              <div className="business-route-actions">
                {canRoute ? (
                  <>
                    <a
                      href={directionUrl("driving")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🚗 En carro
                    </a>
                    <a
                      href={directionUrl("walking")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🚶 Caminando
                    </a>
                  </>
                ) : (
                  <button type="button" disabled>
                    Ruta pendiente de verificación
                  </button>
                )}
                <Link href={"/comercios/"+selected.slug}>Ver comercio</Link>
              </div>

              {canRoute && (
                <small>
                  La ruta se abre en Google Maps. Las rutas peatonales dependen de los caminos y aceras disponibles.
                </small>
              )}
            </>
          ) : (
            <>
              <strong>Selecciona un comercio</strong>
              <span>Toca un pin para ver la dirección y elegir carro o caminando.</span>
            </>
          )}

          {locationStatus && <small>{locationStatus}</small>}
        </aside>
      </div>
    </section>
  );
}
