"use client";

import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";
import {
  buildGoogleDirectionsUrl,
  validRouteCoordinate,
  type RouteCoordinate
} from "@/lib/commerce/directions";
import {
  distanceBetweenCoordinates,
  getNextNavigationCue,
  hasArrivedAtDestination,
  isOffNavigationRoute,
  routeModeLabel,
  shouldRefreshNavigationRoute,
  type InMapRouteMode,
  type InMapRouteResult
} from "@/lib/commerce/in-map-routing";
import {commerceMatchesSearch} from "@/lib/commerce/map-search";
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

const travelModes:Array<{
  value:InMapRouteMode;
  icon:string;
  label:string;
  ariaLabel:string;
}>=[
  {value:"driving",icon:"🚗",label:"Carro",ariaLabel:"carro"},
  {value:"walking",icon:"🚶",label:"Caminar",ariaLabel:"caminando"},
  {value:"cycling",icon:"🚲",label:"Bicicleta",ariaLabel:"bicicleta"},
  {value:"scooter",icon:"🛴",label:"Scooter",ariaLabel:"scooter"}
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

function routeModeIcon(mode:InMapRouteMode){
  switch(mode){
    case "walking": return "🚶";
    case "cycling": return "🚲";
    case "scooter": return "🛴";
    default: return "🚗";
  }
}

function routeLineColor(mode:InMapRouteMode){
  switch(mode){
    case "walking": return "#136f63";
    case "cycling": return "#087a67";
    case "scooter": return "#b85f24";
    default: return "#2463eb";
  }
}

function formatManeuverDistance(meters:number){
  if(meters<30) return "Ahora";
  if(meters<1000) return "En "+Math.max(25,Math.round(meters*3.28084/25)*25)+" ft";
  return "En "+(meters/1609.344).toFixed(1)+" mi";
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
  const gpsWatchRef=useRef<number|null>(null);
  const gpsBootstrapTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const routePreviewTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const activeNavigationModeRef=useRef<InMapRouteMode|null>(null);
  const lastRouteOriginRef=useRef<RouteCoordinate|null>(null);
  const lastRouteRefreshAtRef=useRef(0);
  const routeResultRef=useRef<InMapRouteResult|null>(null);
  const followGpsRef=useRef(true);
  const gpsActiveRef=useRef(false);
  const voiceEnabledRef=useRef(false);
  const lastSpokenInstructionRef=useRef("");

  const [mapReady,setMapReady]=useState(false);
  const [mode,setMode]=useState<RealityMode>("2d");
  const [timeOpen,setTimeOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [basemapState,setBasemapState]=useState<"loading"|"ready"|"error">("loading");
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const [category,setCategory]=useState<MapCategory>("all");
  const [userLocation,setUserLocation]=useState<RouteCoordinate|null>(null);
  const [locationStatus,setLocationStatus]=useState("");
  const [routeResult,setRouteResult]=useState<InMapRouteResult|null>(null);
  const [routeStatus,setRouteStatus]=useState("");
  const [routeBusy,setRouteBusy]=useState<InMapRouteMode|null>(null);
  const [lastRouteMode,setLastRouteMode]=useState<InMapRouteMode>("driving");
  const [gpsActive,setGpsActive]=useState(false);
  const [gpsAccuracy,setGpsAccuracy]=useState<number|null>(null);
  const [gpsTestBusy,setGpsTestBusy]=useState(false);
  const [gpsDiagnostics,setGpsDiagnostics]=useState<{
    secure:boolean|null;
    geolocation:boolean|null;
    permission:string;
    routing:string;
    detail:string;
  }>({
    secure:null,
    geolocation:null,
    permission:"unknown",
    routing:"unknown",
    detail:""
  });
  const [followGps,setFollowGps]=useState(true);
  const [voiceEnabled,setVoiceEnabled]=useState(false);
  const [arrived,setArrived]=useState(false);
  const [directionsOpen,setDirectionsOpen]=useState(false);
  const [addressCopied,setAddressCopied]=useState(false);
  const [searchTerm,setSearchTerm]=useState("");
  const [pendingNavigation,setPendingNavigation]=useState<{
    slug:string;
    mode:InMapRouteMode;
  }|null>(null);

  const mappedBusinesses=useMemo(
    ()=>businesses.filter((business)=>
      business.mapLocation &&
      validRouteCoordinate(business.mapLocation) &&
      (source==="demo" || (
        business.verifiedLocation &&
        business.mapLocation.verified
      )) &&
      (category==="all" || business.category===category)
    ),
    [businesses,category,source]
  );

  const searchResults=useMemo(()=>{
    if(!searchTerm.trim()) return [];
    return mappedBusinesses
      .filter((business)=>commerceMatchesSearch(business,searchTerm))
      .slice(0,6);
  },[mappedBusinesses,searchTerm]);

  const nearbyBusinesses=useMemo(()=>{
    if(!userLocation) return [];

    return mappedBusinesses
      .map((business)=>{
        const location=business.mapLocation!;
        return {
          business,
          distanceMeters:distanceBetweenCoordinates(
            userLocation,
            {
              latitude:location.latitude,
              longitude:location.longitude
            }
          )
        };
      })
      .sort((a,b)=>a.distanceMeters-b.distanceMeters)
      .slice(0,5);
  },[mappedBusinesses,userLocation]);

  const selected=useMemo(
    ()=>businesses.find((business)=>business.slug===selectedSlug) ?? null,
    [businesses,selectedSlug]
  );

  const canRoute=Boolean(
    selected?.mapLocation &&
    validRouteCoordinate(selected.mapLocation) &&
    (
      source==="demo"
        ? selected.demo
        : selected.verifiedLocation && selected.mapLocation.verified
    )
  );

  const demoRoute=Boolean(source==="demo" && selected?.demo && selected?.mapLocation);

  const nextCue=useMemo(
    ()=>routeResult ? getNextNavigationCue(routeResult) : null,
    [routeResult]
  );

  useEffect(()=>{
    routeResultRef.current=routeResult;
  },[routeResult]);

  useEffect(()=>{
    followGpsRef.current=followGps;
  },[followGps]);

  useEffect(()=>{
    gpsActiveRef.current=gpsActive;
  },[gpsActive]);

  useEffect(()=>{
    voiceEnabledRef.current=voiceEnabled;
  },[voiceEnabled]);

  useEffect(()=>{
    if(
      pendingNavigation &&
      selected?.slug===pendingNavigation.slug &&
      canRoute
    ){
      const mode=pendingNavigation.mode;
      setPendingNavigation(null);
      startGpsNavigation(mode);
    }
  },[pendingNavigation,selected?.slug,canRoute]);

  useEffect(()=>{
    if(typeof window!=="undefined"){
      const params=new URLSearchParams(window.location.search);
      const businessSlug=params.get("business");
      const routeMode=params.get("route");

      setSelectedSlug(businessSlug);

      if(
        businessSlug &&
        (
          routeMode==="driving" ||
          routeMode==="walking" ||
          routeMode==="cycling" ||
          routeMode==="scooter"
        )
      ){
        setPendingNavigation({
          slug:businessSlug,
          mode:routeMode
        });
      }
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

    const handleManualMapInteraction=()=>{
      if(!gpsActiveRef.current || !followGpsRef.current) return;
      followGpsRef.current=false;
      setFollowGps(false);
      setLocationStatus(
        "Vista libre · el GPS sigue activo y la ruta continúa recalculándose."
      );
    };

    map.getCanvas().addEventListener("pointerdown",handleManualMapInteraction);

    mapRef.current=map;
    return ()=>{
      map.getCanvas().removeEventListener("pointerdown",handleManualMapInteraction);
      routeAbortRef.current?.abort();
      if("speechSynthesis" in window){
        window.speechSynthesis.cancel();
      }
      if(gpsWatchRef.current!==null && navigator.geolocation){
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
      if(routePreviewTimerRef.current!==null){
        clearTimeout(routePreviewTimerRef.current);
      }
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
      element.className=[
        "business-map-marker",
        business.verifiedLocation ? "verified" : "demo",
        business.slug===selectedSlug ? "selected-destination" : ""
      ].filter(Boolean).join(" ");
      element.setAttribute("aria-label","Ver "+business.name+" en el mapa");
      element.title=business.name;

      const initial=document.createElement("span");
      initial.textContent=business.slug===selectedSlug
        ? "◎"
        : business.name.slice(0,1).toUpperCase();
      element.appendChild(initial);

      if(business.slug===selectedSlug){
        const destinationLabel=document.createElement("small");
        destinationLabel.className="business-map-destination-label";
        destinationLabel.textContent="Destino";
        element.appendChild(destinationLabel);
      }

      element.addEventListener("click",()=>{
        focusBusiness(business);
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
          "line-color":routeLineColor(routeResult.mode),
          "line-width":5,
          "line-opacity":0.96
        }
      });
    }

    if(map.getLayer(ROUTE_LINE_ID)){
      map.setPaintProperty(
        ROUTE_LINE_ID,
        "line-color",
        routeLineColor(routeResult.mode)
      );
      map.setPaintProperty(
        ROUTE_LINE_ID,
        "line-dasharray",
        routeResult.mode==="walking" ? [1.2,1.2] : [1,0]
      );
    }

    if(gpsActive && followGps && userLocation){
      map.easeTo({
        center:[userLocation.longitude,userLocation.latitude],
        zoom:Math.max(map.getZoom(),16),
        duration:350
      });
      return;
    }

    const bounds=new maplibregl.LngLatBounds();
    routeResult.geometry.coordinates.forEach(([longitude,latitude])=>{
      bounds.extend([longitude,latitude]);
    });

    if(!bounds.isEmpty()){
      map.fitBounds(bounds,{
        padding:{top:70,right:70,bottom:210,left:70},
        maxZoom:17,
        duration:750
      });
    }
  },[followGps,gpsActive,mapReady,routeResult,userLocation]);

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

  function focusBusiness(business:CommerceProfile){
    const location=business.mapLocation;
    if(!location) return;

    stopGpsNavigation();
    routeAbortRef.current?.abort();
    routeResultRef.current=null;
    setRouteResult(null);
    setRouteStatus("");
    setArrived(false);
    setDirectionsOpen(false);
    setPendingNavigation(null);
    lastSpokenInstructionRef.current="";
    setSelectedSlug(business.slug);

    mapRef.current?.easeTo({
      center:[location.longitude,location.latitude],
      zoom:17,
      pitch:0,
      duration:650
    });
  }

  function navigateToNearbyBusiness(
    business:CommerceProfile,
    routeMode:InMapRouteMode
  ){
    if(
      !business.verifiedLocation ||
      !business.mapLocation?.verified
    ){
      focusBusiness(business);
      return;
    }

    focusBusiness(business);
    setPendingNavigation({
      slug:business.slug,
      mode:routeMode
    });
  }

  function showUserLocation(next:RouteCoordinate){
    const map=mapRef.current;
    if(!map) return;

    if(userMarkerRef.current){
      userMarkerRef.current.setLngLat([next.longitude,next.latitude]);
      return;
    }

    const element=document.createElement("div");
    element.className="navibori-gps-marker";
    element.setAttribute("aria-label","Tu ubicación GPS");
    const dot=document.createElement("span");
    element.appendChild(dot);

    userMarkerRef.current=new maplibregl.Marker({element})
      .setLngLat([next.longitude,next.latitude])
      .addTo(map);
  }

  function showFullRoute(){
    const map=mapRef.current;
    const route=routeResultRef.current;
    if(!map || !route) return;

    const bounds=new maplibregl.LngLatBounds();
    route.geometry.coordinates.forEach(([longitude,latitude])=>{
      bounds.extend([longitude,latitude]);
    });

    if(userLocation){
      bounds.extend([userLocation.longitude,userLocation.latitude]);
    }

    if(selected?.mapLocation){
      bounds.extend([
        selected.mapLocation.longitude,
        selected.mapLocation.latitude
      ]);
    }

    if(bounds.isEmpty()) return;

    if(gpsActiveRef.current){
      followGpsRef.current=false;
      setFollowGps(false);
      setLocationStatus(
        "Vista de ruta completa · el GPS sigue activo y la ruta continúa recalculándose."
      );
    }

    map.fitBounds(bounds,{
      padding:{top:70,right:70,bottom:220,left:70},
      maxZoom:17,
      duration:650
    });
  }

  function recenterGpsCamera(){
    if(!userLocation) return;

    followGpsRef.current=true;
    setFollowGps(true);

    const activeMode=activeNavigationModeRef.current;
    mapRef.current?.easeTo({
      center:[userLocation.longitude,userLocation.latitude],
      zoom:Math.max(mapRef.current?.getZoom() ?? 16,16),
      pitch:
        activeMode==="driving"
          ? 42
          : activeMode==="walking"
            ? 15
            : 28,
      duration:450
    });

    setLocationStatus(
      "Seguimiento visual GPS reactivado."+
      (gpsAccuracy!==null ? " Precisión ±"+Math.round(gpsAccuracy)+" m." : "")
    );
  }

  function geolocationErrorMessage(error:GeolocationPositionError){
    if(error.code===error.PERMISSION_DENIED){
      return "Permiso de ubicación denegado. Activa Localización para NAVIBORI/Safari y vuelve a intentar.";
    }
    if(error.code===error.POSITION_UNAVAILABLE){
      return "El dispositivo no pudo determinar tu ubicación. Activa Localización, Wi‑Fi o datos móviles y vuelve a intentar.";
    }
    return "El GPS tardó demasiado en responder. Intenta nuevamente en un lugar con mejor señal.";
  }

  async function runGpsDiagnostics(){
    const secure=window.isSecureContext;
    const geolocation="geolocation" in navigator;
    let permission="unknown";
    let routing="checking";

    try{
      if("permissions" in navigator && navigator.permissions?.query){
        const status=await navigator.permissions.query(
          {name:"geolocation"} as PermissionDescriptor
        );
        permission=status.state;
      }
    }catch{
      permission="unsupported";
    }

    setGpsDiagnostics({
      secure,
      geolocation,
      permission,
      routing,
      detail:"Verificando motor de rutas…"
    });

    try{
      const response=await fetch("/api/routing/health",{
        method:"GET",
        cache:"no-store"
      });
      const data=await response.json() as {
        ok?:boolean;
        osrm?:boolean;
        valhalla?:boolean;
      };

      routing=data.ok ? "ok" : "down";
      const providers=[
        data.osrm ? "OSRM ✓" : "OSRM ×",
        data.valhalla ? "Valhalla ✓" : "Valhalla ×"
      ].join(" · ");

      setGpsDiagnostics({
        secure,
        geolocation,
        permission,
        routing,
        detail:providers
      });
    }catch{
      setGpsDiagnostics({
        secure,
        geolocation,
        permission,
        routing:"error",
        detail:"No se pudo comprobar el motor de rutas."
      });
    }
  }

  function testGps(){
    if(!window.isSecureContext){
      setLocationStatus("El GPS requiere una conexión HTTPS segura.");
      return;
    }
    if(!navigator.geolocation){
      setLocationStatus("Este dispositivo o navegador no ofrece geolocalización.");
      return;
    }

    setGpsTestBusy(true);
    setLocationStatus("Probando GPS del dispositivo…");

    const success=(position:GeolocationPosition)=>{
      const next={
        latitude:position.coords.latitude,
        longitude:position.coords.longitude
      };

      if(!validRouteCoordinate(next)){
        setGpsTestBusy(false);
        setLocationStatus("El navegador devolvió una ubicación inválida.");
        return;
      }

      const accuracy=Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null;

      setUserLocation(next);
      setGpsAccuracy(accuracy);
      showUserLocation(next);
      mapRef.current?.easeTo({
        center:[next.longitude,next.latitude],
        zoom:16,
        duration:650
      });
      setGpsTestBusy(false);
      setLocationStatus(
        "✓ GPS funcionando"+
        (accuracy!==null ? " · precisión aproximada ±"+Math.round(accuracy)+" m" : "")
      );
    };

    const fallbackError=(error:GeolocationPositionError)=>{
      setGpsTestBusy(false);
      setLocationStatus(geolocationErrorMessage(error));
    };

    navigator.geolocation.getCurrentPosition(
      success,
      ()=>{
        navigator.geolocation.getCurrentPosition(
          success,
          fallbackError,
          {
            enableHighAccuracy:false,
            timeout:10000,
            maximumAge:60000
          }
        );
      },
      {
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:0
      }
    );
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
        setGpsAccuracy(
          Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null
        );
        setLocationStatus("Tu ubicación está activa solo durante esta sesión.");
        showUserLocation(next);

        if(afterLocate){
          afterLocate(next);
          return;
        }

        mapRef.current?.easeTo({
          center:[next.longitude,next.latitude],
          zoom:16,
          duration:650
        });
      },
      ()=>{
        setLocationStatus(
          "No se pudo acceder a tu ubicación. Verifica el permiso de ubicación del navegador."
        );
      },
      {enableHighAccuracy:true,timeout:12000,maximumAge:10000}
    );
  }

  function speakNavigation(
    instruction:string,
    distanceMeters:number,
    force=false
  ){
    if(!voiceEnabledRef.current || !("speechSynthesis" in window)) return;

    const key=instruction;
    if(!force && lastSpokenInstructionRef.current===key) return;

    lastSpokenInstructionRef.current=key;
    window.speechSynthesis.cancel();

    const prefix=
      distanceMeters>=30
        ? formatManeuverDistance(distanceMeters)+". "
        : "";

    const utterance=new SpeechSynthesisUtterance(prefix+instruction);
    const voices=window.speechSynthesis.getVoices();
    const spanishVoice=voices.find((voice)=>
      /^es(-|_)/i.test(voice.lang)
    );

    if(spanishVoice){
      utterance.voice=spanishVoice;
      utterance.lang=spanishVoice.lang;
    }else{
      utterance.lang="es-US";
    }

    utterance.rate=0.96;
    window.speechSynthesis.speak(utterance);
  }

  async function calculateRoute(
    routeMode:InMapRouteMode,
    origin:RouteCoordinate,
    options:{quiet?:boolean}={}
  ){
    if(!selected?.mapLocation || !canRoute) return;

    const quiet=options.quiet ?? false;
    routeAbortRef.current?.abort();
    const controller=new AbortController();
    routeAbortRef.current=controller;

    lastRouteOriginRef.current=origin;
    lastRouteRefreshAtRef.current=Date.now();
    setLastRouteMode(routeMode);

    if(!quiet){
      setRouteBusy(routeMode);
      setRouteStatus("Calculando ruta · "+routeModeLabel(routeMode)+"…");
    }

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

      routeResultRef.current=data;
      setRouteResult(data);

      const cue=getNextNavigationCue(data);
      if(cue){
        speakNavigation(cue.instruction,cue.distanceMeters);
      }

      setRouteStatus(
        (activeNavigationModeRef.current ? "GPS activo · " : "")+
        routeModeLabel(routeMode)+
        " · "+formatDistance(data.distanceMeters)+
        " · "+formatDuration(data.durationSeconds)
      );
      return data;
    }catch(error){
      if(error instanceof Error && error.name==="AbortError") return;

      if(!quiet){
        routeResultRef.current=null;
        setRouteResult(null);
      }

      setRouteStatus(
        quiet
          ? "GPS activo · no se pudo actualizar la ruta; se conserva la última ruta."
          : error instanceof Error
            ? error.message
            : "No se pudo calcular la ruta."
      );
      return null;
    }finally{
      if(routeAbortRef.current===controller){
        routeAbortRef.current=null;
        if(!quiet) setRouteBusy(null);
      }
    }
  }

  function stopGpsNavigation(){
    if(gpsBootstrapTimerRef.current!==null){
      clearTimeout(gpsBootstrapTimerRef.current);
      gpsBootstrapTimerRef.current=null;
    }
    if(routePreviewTimerRef.current!==null){
      clearTimeout(routePreviewTimerRef.current);
      routePreviewTimerRef.current=null;
    }

    if(gpsWatchRef.current!==null && navigator.geolocation){
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }

    gpsWatchRef.current=null;
    activeNavigationModeRef.current=null;
    lastRouteOriginRef.current=null;
    lastRouteRefreshAtRef.current=0;
    setGpsActive(false);
    setGpsAccuracy(null);
  }

  function startGpsNavigation(routeMode:InMapRouteMode){
    if(!canRoute) return;

    if(!window.isSecureContext){
      setLocationStatus("El GPS requiere una conexión HTTPS segura.");
      return;
    }

    if(!navigator.geolocation){
      setLocationStatus("Este dispositivo o navegador no ofrece GPS/geolocalización.");
      return;
    }

    stopGpsNavigation();
    setArrived(false);
    setDirectionsOpen(false);
    lastSpokenInstructionRef.current="";
    activeNavigationModeRef.current=routeMode;
    setLastRouteMode(routeMode);
    setFollowGps(true);
    followGpsRef.current=true;
    setRouteBusy(routeMode);
    setLocationStatus("Conectando con tu GPS…");

    const cachedOrigin=
      userLocation && validRouteCoordinate(userLocation)
        ? userLocation
        : null;

    let firstFix=cachedOrigin===null;
    let receivedFix=cachedOrigin!==null;
    let fallbackRequested=false;

    const previewThenFollow=async(origin:RouteCoordinate)=>{
      followGpsRef.current=false;
      setFollowGps(false);
      setRouteStatus(
        (demoRoute ? "Ruta DEMO · " : "")+
        "Calculando y dibujando ruta…"
      );

      const route=await calculateRoute(routeMode,origin);
      if(!route) return;

      showFullRoute();
      setRouteStatus(
        routeModeLabel(routeMode)+
        " · ruta lista · "+formatDistance(route.distanceMeters)+
        " · "+formatDuration(route.durationSeconds)
      );

      routePreviewTimerRef.current=setTimeout(()=>{
        routePreviewTimerRef.current=null;
        followGpsRef.current=true;
        setFollowGps(true);
        recenterGpsCamera();
      },1800);
    };

    if(cachedOrigin){
      setGpsActive(true);
      setRouteBusy(null);
      showUserLocation(cachedOrigin);
      void previewThenFollow(cachedOrigin);
    }

    const handlePosition=(position:GeolocationPosition)=>{
      const next={
        latitude:position.coords.latitude,
        longitude:position.coords.longitude
      };

      if(!validRouteCoordinate(next)){
        setLocationStatus("El GPS devolvió una ubicación inválida. Intenta nuevamente.");
        return;
      }

      receivedFix=true;
      if(gpsBootstrapTimerRef.current!==null){
        clearTimeout(gpsBootstrapTimerRef.current);
        gpsBootstrapTimerRef.current=null;
      }

      const accuracy=Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null;

      setGpsActive(true);
      setRouteBusy(null);
      setUserLocation(next);
      setGpsAccuracy(accuracy);
      showUserLocation(next);

      const activeMode=activeNavigationModeRef.current;
      if(!activeMode) return;

      const heading=
        typeof position.coords.heading==="number" &&
        Number.isFinite(position.coords.heading)
          ? position.coords.heading
          : null;
      const speed=
        typeof position.coords.speed==="number" &&
        Number.isFinite(position.coords.speed)
          ? position.coords.speed
          : null;

      if(followGpsRef.current){
        const map=mapRef.current;
        map?.easeTo({
          center:[next.longitude,next.latitude],
          zoom:Math.max(map?.getZoom() ?? 16,16),
          bearing:
            heading!==null && (speed===null || speed>0.8)
              ? heading
              : map?.getBearing() ?? 0,
          pitch:
            activeMode==="driving"
              ? 42
              : activeMode==="walking"
                ? 15
                : 28,
          duration:firstFix ? 650 : 350
        });
      }

      if(firstFix){
        firstFix=false;
        void previewThenFollow(next);
      }else{
        const now=Date.now();
        const currentRoute=routeResultRef.current;
        const offRoute=
          currentRoute!==null &&
          isOffNavigationRoute(next,currentRoute,accuracy);

        if(offRoute && now-lastRouteRefreshAtRef.current>=6000){
          setRouteStatus("Fuera de ruta · recalculando…");
          void calculateRoute(activeMode,next,{quiet:true});
        }else if(
          shouldRefreshNavigationRoute(
            lastRouteOriginRef.current,
            next,
            lastRouteRefreshAtRef.current,
            now
          )
        ){
          void calculateRoute(activeMode,next,{
            quiet:currentRoute!==null
          });
        }
      }

      if(
        selected?.mapLocation &&
        hasArrivedAtDestination(
          next,
          {
            latitude:selected.mapLocation.latitude,
            longitude:selected.mapLocation.longitude
          },
          accuracy
        )
      ){
        setArrived(true);
        setRouteStatus("Has llegado a "+selected.name+".");
        setLocationStatus("Destino alcanzado · GPS detenido.");
        speakNavigation("Has llegado a tu destino.",0,true);
        stopGpsNavigation();
        mapRef.current?.easeTo({
          center:[
            selected.mapLocation.longitude,
            selected.mapLocation.latitude
          ],
          zoom:18,
          pitch:0,
          duration:600
        });
        return;
      }

      setLocationStatus(
        (demoRoute ? "GPS DEMO activo" : "GPS activo")+
        (accuracy!==null ? " · precisión ±"+Math.round(accuracy)+" m" : "")
      );
    };

    const requestLowAccuracyFallback=()=>{
      if(fallbackRequested || receivedFix) return;
      fallbackRequested=true;
      setLocationStatus("GPS de alta precisión no respondió · probando ubicación aproximada…");
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        (error)=>{
          if(!receivedFix && error.code===error.PERMISSION_DENIED){
            setRouteBusy(null);
            setLocationStatus(geolocationErrorMessage(error));
            stopGpsNavigation();
          }
        },
        {
          enableHighAccuracy:false,
          timeout:10000,
          maximumAge:60000
        }
      );
    };

    const handleWatchError=(error:GeolocationPositionError)=>{
      if(receivedFix) return;

      if(error.code===error.PERMISSION_DENIED){
        setRouteBusy(null);
        setLocationStatus(geolocationErrorMessage(error));
        stopGpsNavigation();
        return;
      }

      requestLowAccuracyFallback();
    };

    gpsWatchRef.current=navigator.geolocation.watchPosition(
      handlePosition,
      handleWatchError,
      {
        enableHighAccuracy:true,
        timeout:20000,
        maximumAge:3000
      }
    );

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      (error)=>{
        if(error.code===error.PERMISSION_DENIED){
          setRouteBusy(null);
          setLocationStatus(geolocationErrorMessage(error));
          stopGpsNavigation();
          return;
        }
        requestLowAccuracyFallback();
      },
      {
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:0
      }
    );

    gpsBootstrapTimerRef.current=setTimeout(()=>{
      if(receivedFix) return;
      setRouteBusy(null);
      setLocationStatus(
        "No llegó una posición GPS. Usa “Probar GPS”; si falla, revisa el permiso de Localización del dispositivo."
      );
      stopGpsNavigation();
    },25000);
  }

  function clearRoute(){
    routeAbortRef.current?.abort();
    routeAbortRef.current=null;
    stopGpsNavigation();
    routeResultRef.current=null;
    setRouteResult(null);
    setRouteStatus("");
    setRouteBusy(null);
    setArrived(false);
    lastSpokenInstructionRef.current="";
  }

  function directionUrl(routeMode:InMapRouteMode){
    if(!selected?.mapLocation) return "#";
    return buildGoogleDirectionsUrl(
      selected.mapLocation,
      routeMode,
      userLocation ?? undefined
    );
  }

  async function copySelectedAddress(){
    const address=selected?.mapLocation?.address ?? selected?.locationLabel;
    if(!address) return;

    try{
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      window.setTimeout(()=>setAddressCopied(false),1800);
    }catch{
      setAddressCopied(false);
    }
  }

  return (
    <section className="map-panel spatial-cockpit full-map-cockpit" aria-label="Mapa de comercios NAVIBORI">
      <div className="map-stage full-map-stage">
        <div ref={mapNode} className="map-canvas full-map-canvas" />

        <button
          type="button"
          className={"full-map-gps-button "+(gpsActive ? "active" : "")}
          aria-label={gpsActive ? "Recentrar GPS" : "Probar GPS"}
          onClick={()=>{
            if(gpsActive && userLocation){
              recenterGpsCamera();
            }else{
              testGps();
            }
          }}
          disabled={gpsTestBusy}
        >
          {gpsTestBusy ? "…" : gpsActive ? "◎" : "GPS"}
        </button>

        <button
          type="button"
          className="full-map-menu-button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={()=>setMenuOpen((open)=>!open)}
        >
          {menuOpen ? "×" : "☰"}
        </button>

        {gpsActive && routeResult && selected && (
          <aside className="navibori-navigation-hud" aria-live="polite">
            <div className="navibori-navigation-maneuver">
              <span>
                {nextCue
                  ? formatManeuverDistance(nextCue.distanceMeters)
                  : routeModeIcon(routeResult.mode)}
              </span>
              <strong>
                {nextCue?.instruction ?? "Sigue la ruta marcada."}
              </strong>
              <small>{selected.name}</small>
            </div>

            <div className="navibori-navigation-footer">
              <div>
                <span>ETA</span>
                <strong>{formatDuration(routeResult.durationSeconds)}</strong>
              </div>
              <div>
                <span>Restante</span>
                <strong>{formatDistance(routeResult.distanceMeters)}</strong>
              </div>
              <div>
                <span>Modo</span>
                <strong>{routeModeIcon(routeResult.mode)} {routeModeLabel(routeResult.mode)}</strong>
              </div>
              <button type="button" onClick={recenterGpsCamera}>
                ◎ Recentrar
              </button>
              <button
                type="button"
                className={voiceEnabled ? "active" : ""}
                onClick={()=>{
                  const next=!voiceEnabled;
                  voiceEnabledRef.current=next;
                  setVoiceEnabled(next);
                  if(!next){
                    if("speechSynthesis" in window){
                      window.speechSynthesis.cancel();
                    }
                    lastSpokenInstructionRef.current="";
                  }else if(nextCue){
                    speakNavigation(
                      nextCue.instruction,
                      nextCue.distanceMeters,
                      true
                    );
                  }
                }}
              >
                {voiceEnabled ? "🔊 Voz" : "🔇 Voz"}
              </button>
              <button
                type="button"
                className="danger"
                onClick={()=>{
                  stopGpsNavigation();
                  setLocationStatus("GPS detenido. La ruta permanece visible.");
                }}
              >
                Finalizar
              </button>
            </div>
          </aside>
        )}

        <div className="full-map-brand-pill" aria-label="Estado de NAVIBORI">
          <strong>NAVIBORI</strong>
          <span>
            {gpsActive
              ? demoRoute ? "GPS DEMO" : "GPS LIVE"
              : source==="live" ? "Comercios LIVE" : "Comercios DEMO"}
          </span>
        </div>

        {menuOpen && (
          <aside className="full-map-menu" aria-label="Menú principal NAVIBORI">
            <div className="full-map-menu-head">
              <div>
                <span>MENÚ</span>
                <strong>Explorar y navegar</strong>
              </div>
              <button
                type="button"
                onClick={()=>setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>

            <div className="full-map-menu-search">
              <input
                type="search"
                value={searchTerm}
                onChange={(event)=>setSearchTerm(event.target.value)}
                placeholder="Buscar comercio o dirección"
                aria-label="Buscar comercio o dirección"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={()=>setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>

            {searchResults.length>0 && (
              <div className="full-map-menu-results">
                {searchResults.map((business)=>(
                  <button
                    type="button"
                    key={business.id}
                    onClick={()=>{
                      focusBusiness(business);
                      setSearchTerm("");
                      setMenuOpen(false);
                    }}
                  >
                    <strong>{business.name}</strong>
                    <small>{business.mapLocation?.address ?? business.locationLabel}</small>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.trim() && searchResults.length===0 && (
              <small className="full-map-menu-empty">
                No se encontraron comercios con esa búsqueda.
              </small>
            )}

            <section className="full-map-menu-section">
              <span>GPS</span>
              <div className="full-map-menu-grid">
                <button
                  type="button"
                  onClick={()=>{
                    testGps();
                    setMenuOpen(false);
                  }}
                  disabled={gpsTestBusy}
                >
                  {gpsTestBusy ? "Probando…" : "◎ Probar GPS"}
                </button>
                <button
                  type="button"
                  onClick={()=>{
                    locateMe();
                    setMenuOpen(false);
                  }}
                >
                  ⦿ Mi ubicación
                </button>
                {gpsActive && (
                  <button
                    type="button"
                    onClick={()=>{
                      recenterGpsCamera();
                      setMenuOpen(false);
                    }}
                  >
                    ◎ Recentrar GPS
                  </button>
                )}
              </div>
              <button
                type="button"
                className="full-map-diagnostic-button"
                onClick={runGpsDiagnostics}
              >
                Diagnosticar GPS y rutas
              </button>

              <div className="full-map-gps-diagnostics" aria-live="polite">
                <span>
                  HTTPS
                  <strong>
                    {gpsDiagnostics.secure===null
                      ? "—"
                      : gpsDiagnostics.secure ? "✓" : "×"}
                  </strong>
                </span>
                <span>
                  GPS navegador
                  <strong>
                    {gpsDiagnostics.geolocation===null
                      ? "—"
                      : gpsDiagnostics.geolocation ? "✓" : "×"}
                  </strong>
                </span>
                <span>
                  Permiso
                  <strong>{gpsDiagnostics.permission}</strong>
                </span>
                <span>
                  Rutas
                  <strong>{gpsDiagnostics.routing}</strong>
                </span>
              </div>
              {gpsDiagnostics.detail && (
                <small className="full-map-menu-status">{gpsDiagnostics.detail}</small>
              )}
              {locationStatus && <small className="full-map-menu-status">{locationStatus}</small>}
            </section>

            <section className="full-map-menu-section">
              <span>Categorías</span>
              <div className="full-map-category-grid">
                {categories.map((item)=>(
                  <button
                    type="button"
                    key={item.value}
                    className={category===item.value ? "active" : ""}
                    onClick={()=>{
                      clearRoute();
                      setCategory(item.value);
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="full-map-menu-section">
              <span>Vista</span>
              <div className="full-map-menu-grid">
                <button
                  type="button"
                  className={mode==="2d" ? "active" : ""}
                  onClick={()=>activateMapMode("2d")}
                >
                  2D
                </button>
                <button
                  type="button"
                  className={mode==="globe" ? "active" : ""}
                  onClick={()=>activateMapMode("globe")}
                >
                  Globo
                </button>
              </div>
            </section>

            <nav className="full-map-menu-links" aria-label="Opciones NAVIBORI">
              <Link href="/comercios">Comercios</Link>
              <Link href="/ar">AR</Link>
              <Link href="/twin">Twin</Link>
              <Link href="/studio">Studio</Link>
              <Link href="/nova">NOVA</Link>
              <Link href="/xeno">XENO</Link>
            </nav>

            <small className="full-map-menu-foot">
              Activa “Recibir especiales” para recibir promociones LIVE en la aplicación instalada.
            </small>
          </aside>
        )}



        {gpsActive && !followGps && userLocation && (
          <button
            type="button"
            className="gps-recenter-floating"
            onClick={recenterGpsCamera}
          >
            ◎ Recentrar en mi GPS
          </button>
        )}

        {userLocation && nearbyBusinesses.length>0 && !gpsActive && !menuOpen && (
          <aside className="nearby-businesses-panel" aria-label="Comercios cerca de mí">
            <div className="nearby-businesses-heading">
              <div>
                <span>Cerca de mí</span>
                <strong>Comercios próximos</strong>
              </div>
              {gpsAccuracy!==null && (
                <small>GPS ±{Math.round(gpsAccuracy)} m</small>
              )}
            </div>

            <div className="nearby-businesses-list">
              {nearbyBusinesses.map(({business,distanceMeters})=>(
                <article
                  key={business.id}
                  className={"nearby-business-item "+(
                    business.slug===selectedSlug ? "selected" : ""
                  )}
                >
                  <button
                    type="button"
                    className="nearby-business-main"
                    onClick={()=>focusBusiness(business)}
                  >
                    <span>Aprox. {formatDistance(distanceMeters)} · en línea directa</span>
                    <strong>{business.name}</strong>
                    <small>
                      {business.mapLocation?.address ?? business.locationLabel}
                    </small>
                  </button>

                  {business.verifiedLocation && business.mapLocation?.verified ? (
                    <div className="nearby-business-route-buttons">
                      {travelModes.map((travel)=>(
                        <button
                          type="button"
                          key={travel.value}
                          onClick={()=>navigateToNearbyBusiness(business,travel.value)}
                          aria-label={"Navegar en "+travel.ariaLabel+" a "+business.name}
                          title={travel.label}
                        >
                          <span aria-hidden="true">{travel.icon}</span>
                          <small>{travel.label}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="nearby-business-demo">DEMO</span>
                  )}
                </article>
              ))}
            </div>
          </aside>
        )}


        <aside
          className={"business-route-card "+(
            gpsActive && routeResult ? "navigation-active" : ""
          )}
          aria-live="polite"
        >
          {selected ? (
            <>
              <div className="business-route-title-row">
                <span className={"commerce-demo-badge "+(selected.demo ? "" : "live")}>
                  {selected.demo ? "DEMO" : "LIVE"}
                </span>
                {gpsActive && (
                  <span className="gps-live-badge">
                    {demoRoute ? "GPS DEMO" : "GPS LIVE"}
                  </span>
                )}
              </div>

              <strong>{selected.name}</strong>
              <div className="business-route-address-row">
                <span>{selected.mapLocation?.address ?? selected.locationLabel}</span>
                <button type="button" onClick={copySelectedAddress}>
                  {addressCopied ? "✓ Copiada" : "Copiar dirección"}
                </button>
              </div>

              {canRoute ? (
                <>
                  <div className="business-route-launch">
                    <div>
                      <span>¿Cómo quieres llegar?</span>
                      <small>Un toque inicia la ruta y el GPS.</small>
                    </div>
                    <div className="business-route-mode-actions">
                      {travelModes.map((travel)=>(
                        <button
                          type="button"
                          key={travel.value}
                          className={gpsActive && lastRouteMode===travel.value ? "active" : ""}
                          disabled={routeBusy!==null}
                          onClick={()=>{
                            setMenuOpen(false);
                            startGpsNavigation(travel.value);
                          }}
                          aria-label={"Iniciar GPS en "+travel.ariaLabel+" hacia "+selected.name}
                        >
                          <span aria-hidden="true">{travel.icon}</span>
                          <strong>
                            {routeBusy===travel.value ? "Calculando…" : travel.label}
                          </strong>
                        </button>
                      ))}
                    </div>
                  </div>

                  {arrived && (
                    <div className="navibori-arrival-card" role="status">
                      <span>Destino alcanzado</span>
                      <strong>Has llegado a {selected.name}.</strong>
                    </div>
                  )}

                  {routeResult && nextCue && !arrived && (
                    <div className="navibori-turn-card" aria-live="polite">
                      <span>{formatManeuverDistance(nextCue.distanceMeters)}</span>
                      <strong>{nextCue.instruction}</strong>
                    </div>
                  )}

                  {routeResult && (
                    <div className="navibori-route-summary">
                      <div>
                        <span>Distancia restante</span>
                        <strong>{formatDistance(routeResult.distanceMeters)}</strong>
                      </div>
                      <div>
                        <span>Tiempo estimado</span>
                        <strong>{formatDuration(routeResult.durationSeconds)}</strong>
                      </div>
                      <div>
                        <span>Modo</span>
                        <strong>{routeModeIcon(routeResult.mode)} {routeModeLabel(routeResult.mode)}</strong>
                      </div>
                      {gpsActive && (
                        <div>
                          <span>GPS</span>
                          <strong>
                            {gpsAccuracy!==null
                              ? "±"+Math.round(gpsAccuracy)+" m"
                              : "Activo"}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  {routeResult && routeResult.steps.length>0 && (
                    <section className="navibori-directions-panel">
                      <button
                        type="button"
                        className="navibori-directions-toggle"
                        aria-expanded={directionsOpen}
                        onClick={()=>setDirectionsOpen((open)=>!open)}
                      >
                        <span>Indicaciones de la ruta</span>
                        <strong>
                          {directionsOpen ? "Ocultar" : routeResult.steps.length+" pasos"}
                        </strong>
                      </button>

                      {directionsOpen && (
                        <ol>
                          {routeResult.steps.slice(0,12).map((step,index)=>(
                            <li key={index+"-"+step.type+"-"+step.name}>
                              <span className="navibori-direction-index">
                                {step.type==="arrive" ? "◎" : index+1}
                              </span>
                              <div>
                                <strong>{step.instruction}</strong>
                                <small>
                                  {step.distanceMeters>0
                                    ? formatDistance(step.distanceMeters)
                                    : step.type==="arrive"
                                      ? "Destino"
                                      : "Continúa"}
                                  {step.name ? " · "+step.name : ""}
                                </small>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  )}

                  <div className="business-route-actions secondary">
                    {routeResult && (
                      <button
                        type="button"
                        className={voiceEnabled ? "active" : ""}
                        onClick={()=>{
                          const next=!voiceEnabled;
                          voiceEnabledRef.current=next;
                          setVoiceEnabled(next);

                          if(!next){
                            if("speechSynthesis" in window){
                              window.speechSynthesis.cancel();
                            }
                            lastSpokenInstructionRef.current="";
                          }else if(nextCue){
                            speakNavigation(
                              nextCue.instruction,
                              nextCue.distanceMeters,
                              true
                            );
                          }
                        }}
                      >
                        {voiceEnabled ? "🔊 Voz activada" : "🔇 Activar voz"}
                      </button>
                    )}
                    {routeResult && routeResult.steps.length>0 && (
                      <button
                        type="button"
                        className={directionsOpen ? "active" : ""}
                        onClick={()=>setDirectionsOpen((open)=>!open)}
                      >
                        🧭 Indicaciones
                      </button>
                    )}
                    {routeResult && (
                      <button type="button" onClick={showFullRoute}>
                        🗺️ Ver ruta completa
                      </button>
                    )}
                    {gpsActive && (
                      <button
                        type="button"
                        onClick={()=>{
                          stopGpsNavigation();
                          setLocationStatus("GPS detenido. La ruta permanece visible.");
                        }}
                      >
                        Detener GPS
                      </button>
                    )}
                    {routeResult && (
                      <button type="button" onClick={clearRoute}>
                        Limpiar ruta
                      </button>
                    )}
                    {!demoRoute && (
                      <a
                        href={directionUrl(routeResult?.mode ?? lastRouteMode)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir en Google Maps
                      </a>
                    )}
                    <Link href={"/comercios/"+selected.slug}>Ver comercio</Link>
                  </div>

                  {demoRoute && (
                    <div className="navibori-demo-route-warning" role="status">
                      Ruta de prueba DEMO · el destino es sintético y no representa un comercio real.
                    </div>
                  )}
                  <small>
                    NAVIBORI usa el GPS del dispositivo mientras esta navegación está activa.
                    El pin “Destino” identifica la entrada verificada del comercio, “Ver ruta completa”
                    muestra el recorrido completo y “Indicaciones” permite revisar los próximos pasos
                    sin detener la navegación.
                    El marcador se mueve contigo, muestra el próximo giro y recalcula si avanzas
                    o te sales de la ruta. Si exploras el mapa manualmente, el seguimiento visual
                    se pausa sin detener el GPS; “Recentrar en mi GPS” vuelve a seguir tu posición. Bicicleta y scooter usan el perfil de micromovilidad
                    basado en rutas de bicicleta; verifica señalización y condiciones locales.
                    Tu ubicación no se guarda en Supabase.
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
                    La precisión depende del GPS del dispositivo y de los caminos registrados en OpenStreetMap.
                  </small>
                </>
              ) : (
                <>
                  <div className="business-route-actions">
                    <button type="button" disabled>Ruta pendiente de verificación</button>
                    <Link href={"/comercios/"+selected.slug}>Ver comercio</Link>
                  </div>
                  <small>
                    Los puntos DEMO no generan rutas GPS reales. Un comercio LIVE necesita dirección y coordenadas verificadas.
                  </small>
                </>
              )}
            </>
          ) : (
            <>
              <strong>Selecciona un comercio</strong>
              <span>
                Busca por nombre, categoría o dirección; toca un pin; o usa “Mi ubicación”
                para ordenar comercios cercanos y comenzar navegación GPS en carro, caminando,
                bicicleta o scooter.
              </span>
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
