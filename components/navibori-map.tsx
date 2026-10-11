"use client";

import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleDirectionsUrl,
  validRouteCoordinate,
  type RouteCoordinate
} from "@/lib/commerce/directions";
import {
  distanceBetweenCoordinates,
  getNextNavigationCue,
  getNavigationCueAtProgress,
  getNavigationProgress,
  getRouteBearingNearPoint,
  hasArrivedAtDestination,
  isOffNavigationRoute,
  routeModeLabel,
  shouldRefreshNavigationRoute,
  type InMapRouteMode,
  type InMapRouteResult
} from "@/lib/commerce/in-map-routing";
import {commerceMatchesSearch} from "@/lib/commerce/map-search";
import {canNavigateCommerce} from "@/lib/commerce/navigation-eligibility";
import {
  browserNaviboriLocale,
  naviboriCopy,
  type NaviboriLocale
} from "@/lib/i18n/device-locale";
import type {CommerceCategory,CommerceProfile} from "@/lib/commerce/types";

const JUANA_DIAZ_REFERENCE:[number,number]=[-66.506,18.052];
const ROUTE_SOURCE_ID="navibori-commerce-route";
const ROUTE_GLOW_ID="navibori-commerce-route-glow";
const ROUTE_CASING_ID="navibori-commerce-route-casing";
const ROUTE_LINE_ID="navibori-commerce-route-line";
const ROUTE_ARROW_ID="navibori-commerce-route-arrows";
const ROUTE_ARROW_IMAGE_ID="navibori-route-arrow-image";

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

function formatArrivalTime(seconds:number,locale:string){
  const arrival=new Date(Date.now()+Math.max(0,seconds)*1000);
  return new Intl.DateTimeFormat(locale,{
    hour:"numeric",
    minute:"2-digit"
  }).format(arrival);
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
    case "walking": return "#00a884";
    case "cycling": return "#00a884";
    case "scooter": return "#ff8a34";
    default: return "#0a84ff";
  }
}

function formatManeuverDistance(
  meters:number,
  language:"es"|"en"="es"
){
  if(meters<30) return language==="en" ? "Now" : "Ahora";
  const prefix=language==="en" ? "In " : "En ";
  if(meters<1000){
    return prefix+Math.max(25,Math.round(meters*3.28084/25)*25)+" ft";
  }
  return prefix+(meters/1609.344).toFixed(1)+" mi";
}

function ensureRouteArrowImage(map:maplibregl.Map){
  if(map.hasImage(ROUTE_ARROW_IMAGE_ID)) return;

  const size=36;
  const canvas=document.createElement("canvas");
  canvas.width=size;
  canvas.height=size;
  const context=canvas.getContext("2d");
  if(!context) return;

  context.clearRect(0,0,size,size);
  context.save();
  context.translate(size/2,size/2);
  context.fillStyle="#ffffff";
  context.strokeStyle="rgba(15,23,42,.72)";
  context.lineWidth=2;
  context.beginPath();
  context.moveTo(-10,-8);
  context.lineTo(11,0);
  context.lineTo(-10,8);
  context.lineTo(-5,0);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();

  const image=context.getImageData(0,0,size,size);
  map.addImage(ROUTE_ARROW_IMAGE_ID,image,{pixelRatio:2});
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
  const wakeLockRef=useRef<WakeLockSentinel|null>(null);

  const [deviceLocale,setDeviceLocale]=useState<NaviboriLocale>({
    language:"es",
    locale:"es-PR",
    speechLocale:"es-PR",
    valhallaLocale:"es-ES"
  });
  const copy=useMemo(
    ()=>naviboriCopy(deviceLocale.language),
    [deviceLocale.language]
  );

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
  const [gpsSpeedKph,setGpsSpeedKph]=useState<number|null>(null);
  const [gpsTestBusy,setGpsTestBusy]=useState(false);
  const [navigationPhase,setNavigationPhase]=useState<
    "idle"|"permission"|"gps"|"routing"|"navigating"|"error"
  >("idle");
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

  const canRoute=canNavigateCommerce(selected,source);

  const demoRoute=Boolean(source==="demo" && selected?.demo && selected?.mapLocation);

  const navigationProgress=useMemo(
    ()=>routeResult && userLocation
      ? getNavigationProgress(routeResult,userLocation)
      : null,
    [routeResult,userLocation]
  );

  const nextCue=useMemo(
    ()=>{
      if(!routeResult) return null;
      if(navigationProgress){
        return getNavigationCueAtProgress(
          routeResult,
          navigationProgress.traveledMeters
        );
      }
      return getNextNavigationCue(routeResult);
    },
    [routeResult,navigationProgress]
  );

  useEffect(()=>{
    const locale=browserNaviboriLocale();
    setDeviceLocale(locale);
    document.documentElement.lang=locale.locale;
  },[]);

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
    const handleVisibility=()=>{
      if(
        document.visibilityState==="visible" &&
        gpsActiveRef.current &&
        "wakeLock" in navigator
      ){
        void navigator.wakeLock.request("screen")
          .then((sentinel)=>{
            wakeLockRef.current=sentinel;
          })
          .catch(()=>{});
      }
    };

    document.addEventListener("visibilitychange",handleVisibility);
    return ()=>document.removeEventListener("visibilitychange",handleVisibility);
  },[]);

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

    const showZoomControls=window.matchMedia("(min-width: 768px)").matches;
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass:true,
        showZoom:showZoomControls
      }),
      "top-right"
    );

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

    if(!routeResult){
      const empty={
        type:"FeatureCollection" as const,
        features:[]
      };
      const source=map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;
      source?.setData(empty);
      return;
    }

    let cancelled=false;
    const retryTimers:number[]=[];

    const renderRoute=()=>{
      if(cancelled) return true;
      return drawRouteOnMap(routeResult);
    };

    const rendered=renderRoute();
    if(!rendered){
      for(const delay of [100,300,700,1400]){
        retryTimers.push(
          window.setTimeout(()=>{
            renderRoute();
          },delay)
        );
      }
    }

    const handleStyleReady=()=>{
      renderRoute();
    };
    map.once("idle",handleStyleReady);

    const cleanup=()=>{
      cancelled=true;
      retryTimers.forEach((timer)=>window.clearTimeout(timer));
      map.off("idle",handleStyleReady);
    };

    if(gpsActive && followGps && userLocation){
      map.easeTo({
        center:[userLocation.longitude,userLocation.latitude],
        zoom:Math.max(map.getZoom(),16),
        duration:350
      });
      return cleanup;
    }

    const bounds=new maplibregl.LngLatBounds();
    routeResult.geometry.coordinates.forEach(([longitude,latitude])=>{
      bounds.extend([longitude,latitude]);
    });

    if(!bounds.isEmpty()){
      map.fitBounds(bounds,{
        padding:{top:70,right:70,bottom:170,left:70},
        maxZoom:17,
        duration:750
      });
    }

    return cleanup;
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
    if(!canNavigateCommerce(business,source)){
      focusBusiness(business);
      setLocationStatus(
        source==="live"
          ? "Este comercio todavía no tiene una ubicación LIVE verificada para navegación."
          : "Este destino DEMO no tiene coordenadas válidas para probar navegación."
      );
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

  function drawRouteOnMap(route:InMapRouteResult){
    const map=mapRef.current;
    if(
      !map ||
      !map.isStyleLoaded() ||
      route.geometry.coordinates.length<2
    ){
      return false;
    }

    const feature={
      type:"Feature" as const,
      properties:{mode:route.mode},
      geometry:route.geometry
    };

    try{
      const existing=map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;

      if(existing){
        existing.setData(feature);
      }else{
        map.addSource(ROUTE_SOURCE_ID,{
          type:"geojson",
          data:feature,
          lineMetrics:true
        });
      }

      for(const layerId of [
        ROUTE_ARROW_ID,
        ROUTE_LINE_ID,
        ROUTE_CASING_ID,
        ROUTE_GLOW_ID
      ]){
        if(map.getLayer(layerId)){
          map.removeLayer(layerId);
        }
      }

      map.addLayer({
        id:ROUTE_GLOW_ID,
        type:"line",
        source:ROUTE_SOURCE_ID,
        layout:{
          "line-cap":"round",
          "line-join":"round"
        },
        paint:{
          "line-color":routeLineColor(route.mode),
          "line-width":18,
          "line-opacity":0.28,
          "line-blur":3
        }
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
          "line-color":"#17324d",
          "line-width":13,
          "line-opacity":0.98
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
          "line-color":routeLineColor(route.mode),
          "line-width":8.5,
          "line-opacity":1
        }
      });

      ensureRouteArrowImage(map);
      if(map.hasImage(ROUTE_ARROW_IMAGE_ID)){
        map.addLayer({
          id:ROUTE_ARROW_ID,
          type:"symbol",
          source:ROUTE_SOURCE_ID,
          layout:{
            "symbol-placement":"line",
            "symbol-spacing":70,
            "icon-image":ROUTE_ARROW_IMAGE_ID,
            "icon-size":0.72,
            "icon-rotation-alignment":"map",
            "icon-pitch-alignment":"map",
            "icon-allow-overlap":true,
            "icon-ignore-placement":true
          }
        });
      }

      for(const layerId of [
        ROUTE_GLOW_ID,
        ROUTE_CASING_ID,
        ROUTE_LINE_ID,
        ROUTE_ARROW_ID
      ]){
        if(map.getLayer(layerId)){
          map.moveLayer(layerId);
        }
      }

      map.triggerRepaint();
      return Boolean(
        map.getLayer(ROUTE_LINE_ID) &&
        map.getSource(ROUTE_SOURCE_ID)
      );
    }catch{
      return false;
    }
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
      zoom:Math.max(mapRef.current?.getZoom() ?? 16,16.8),
      offset:[0,110],
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
      setNavigationPhase("error");
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
        (selected && canRoute ? "✓ GPS funcionando · iniciando ruta" : "✓ GPS funcionando · selecciona un comercio")+
        (accuracy!==null ? " · precisión aproximada ±"+Math.round(accuracy)+" m" : "")
      );

      if(selected && canRoute){
        window.setTimeout(()=>{
          startGpsNavigation(lastRouteMode,next);
        },0);
      }
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

    const distanceBand=
      distanceMeters<60
        ? "now"
        : distanceMeters<250
          ? "near"
          : "far";
    const key=instruction+"|"+distanceBand;
    if(!force && lastSpokenInstructionRef.current===key) return;

    lastSpokenInstructionRef.current=key;
    window.speechSynthesis.cancel();

    const prefix=
      distanceMeters>=30
        ? formatManeuverDistance(distanceMeters,deviceLocale.language)+". "
        : "";

    const utterance=new SpeechSynthesisUtterance(prefix+instruction);
    const voices=window.speechSynthesis.getVoices();
    const preferredVoice=voices.find((voice)=>
      voice.lang.toLowerCase()===deviceLocale.speechLocale.toLowerCase()
    ) ?? voices.find((voice)=>
      voice.lang.toLowerCase().startsWith(deviceLocale.language+"-") ||
      voice.lang.toLowerCase()===deviceLocale.language
    );

    if(preferredVoice){
      utterance.voice=preferredVoice;
      utterance.lang=preferredVoice.lang;
    }else{
      utterance.lang=deviceLocale.speechLocale;
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
      setNavigationPhase("routing");
      setRouteStatus(
        (deviceLocale.language==="en" ? "Calculating route · " : "Calculando ruta · ")+
        routeModeLabel(routeMode,deviceLocale.locale)+
        "…"
      );
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
          },
          locale:deviceLocale.valhallaLocale
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
      const routeDrawn=drawRouteOnMap(data);
      if(!routeDrawn){
        window.requestAnimationFrame(()=>{
          drawRouteOnMap(data);
        });
      }
      if(activeNavigationModeRef.current){
        setNavigationPhase("navigating");
      }

      const cue=getNextNavigationCue(data);
      if(cue){
        speakNavigation(cue.instruction,cue.distanceMeters);
      }

      setRouteStatus(
        (activeNavigationModeRef.current ? copy.gpsActive+" · " : "")+
        routeModeLabel(routeMode,deviceLocale.locale)+
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

      if(!quiet){
        setNavigationPhase("error");
      }
      setRouteStatus(
        quiet
          ? (deviceLocale.language==="en"
              ? "GPS active · route refresh failed; keeping the last route."
              : "GPS activo · no se pudo actualizar la ruta; se conserva la última ruta.")
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

  function stopGpsNavigation(options:{preservePhase?:boolean}={}){
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
    setGpsSpeedKph(null);
    if(!options.preservePhase){
      setNavigationPhase("idle");
    }

    if(wakeLockRef.current){
      void wakeLockRef.current.release().catch(()=>{});
      wakeLockRef.current=null;
    }
  }

  function startGpsNavigation(
    routeMode:InMapRouteMode,
    initialOrigin?:RouteCoordinate
  ){
    if(!canRoute) return;

    void runGpsDiagnostics();

    if(!window.isSecureContext){
      setLocationStatus("El GPS requiere una conexión HTTPS segura.");
      return;
    }

    if(!navigator.geolocation){
      setNavigationPhase("error");
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
    setNavigationPhase("permission");
    setLocationStatus("Conectando con tu GPS…");

    if("wakeLock" in navigator){
      void navigator.wakeLock.request("screen")
        .then((sentinel)=>{
          wakeLockRef.current=sentinel;
        })
        .catch(()=>{});
    }

    const cachedOrigin=
      initialOrigin && validRouteCoordinate(initialOrigin)
        ? initialOrigin
        : userLocation && validRouteCoordinate(userLocation)
          ? userLocation
          : null;

    let firstFix=cachedOrigin===null;
    let receivedFix=cachedOrigin!==null;
    let fallbackRequested=false;

    const previewThenFollow=async(origin:RouteCoordinate)=>{
      followGpsRef.current=false;
      setFollowGps(false);
      setRouteStatus(
        (demoRoute
          ? deviceLocale.language==="en" ? "DEMO route · " : "Ruta DEMO · "
          : "")+
        copy.routeCalculating
      );

      const route=await calculateRoute(routeMode,origin);
      if(!route) return;

      showFullRoute();
      setRouteStatus(
        routeModeLabel(routeMode,deviceLocale.locale)+
        " · "+copy.routeReady+" · "+formatDistance(route.distanceMeters)+
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
      setNavigationPhase("gps");
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

      setGpsSpeedKph(
        speed!==null
          ? Math.max(0,Math.round(speed*3.6))
          : null
      );

      if(followGpsRef.current){
        const map=mapRef.current;
        map?.easeTo({
          center:[next.longitude,next.latitude],
          zoom:Math.max(map?.getZoom() ?? 16,16.8),
          offset:[0,110],
          bearing:
            heading!==null && (speed===null || speed>0.8)
              ? heading
              : routeResultRef.current
                ? getRouteBearingNearPoint(routeResultRef.current,next) ??
                  map?.getBearing() ??
                  0
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
        if(currentRoute){
          const liveProgress=getNavigationProgress(currentRoute,next);
          const liveCue=liveProgress
            ? getNavigationCueAtProgress(
                currentRoute,
                liveProgress.traveledMeters
              )
            : null;

          if(liveCue && liveCue.distanceMeters<=350){
            speakNavigation(
              liveCue.instruction,
              liveCue.distanceMeters
            );
          }
        }

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
        speakNavigation(copy.destinationReached,0,true);
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
        (demoRoute ? copy.gpsDemoActive : copy.gpsActive)+
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
            stopGpsNavigation({preservePhase:true});
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
        setNavigationPhase("error");
        setLocationStatus(geolocationErrorMessage(error));
        stopGpsNavigation({preservePhase:true});
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
          setNavigationPhase("error");
          setLocationStatus(geolocationErrorMessage(error));
          stopGpsNavigation({preservePhase:true});
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
      setNavigationPhase("error");
      setLocationStatus(
        "No llegó una posición GPS. Pulsa “Reintentar GPS” o abre ☰ > Diagnosticar GPS y rutas."
      );
      stopGpsNavigation({preservePhase:true});
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

  function appleDirectionUrl(routeMode:InMapRouteMode){
    if(!selected?.mapLocation) return "#";
    return buildAppleMapsDirectionsUrl(
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

        {navigationPhase!=="idle" && selected && (
          <div className={"navibori-navigation-phase "+navigationPhase} aria-live="polite">
            <span className={navigationPhase==="permission"||navigationPhase==="gps"||navigationPhase==="routing"||navigationPhase==="navigating" ? "done" : ""}>1 Permiso</span>
            <span className={navigationPhase==="gps"||navigationPhase==="routing"||navigationPhase==="navigating" ? "done" : ""}>2 GPS</span>
            <span className={navigationPhase==="routing"||navigationPhase==="navigating" ? "done" : ""}>3 Ruta</span>
            <span className={navigationPhase==="navigating" ? "done" : ""}>4 Navegando</span>
            {navigationPhase==="error" && (
              <button
                type="button"
                onClick={()=>startGpsNavigation(lastRouteMode)}
              >
                Reintentar GPS
              </button>
            )}
          </div>
        )}

        {gpsActive && routeResult && selected && (
          <aside className="navibori-navigation-hud" aria-live="polite">
            <div className="navibori-navigation-maneuver">
              <span>
                {nextCue
                  ? formatManeuverDistance(nextCue.distanceMeters)
                  : routeModeIcon(routeResult.mode)}
              </span>
              <strong>
                {nextCue?.instruction ?? (
                  deviceLocale.language==="en"
                    ? "Follow the highlighted route."
                    : "Sigue la ruta marcada."
                )}
              </strong>
              <small>{selected.name}</small>
            </div>

            <div className="navibori-navigation-footer">
              <div>
                <span>ETA</span>
                <strong>
                  {formatArrivalTime(
                    navigationProgress?.remainingSeconds ??
                    routeResult.durationSeconds,
                    deviceLocale.locale
                  )}
                </strong>
              </div>
              <div>
                <span>{deviceLocale.language==="en" ? "Remaining" : "Restante"}</span>
                <strong>
                  {formatDistance(
                    navigationProgress?.remainingMeters ??
                    routeResult.distanceMeters
                  )}
                </strong>
              </div>
              <div>
                <span>Velocidad</span>
                <strong>
                  {gpsSpeedKph!==null ? gpsSpeedKph+" km/h" : "—"}
                </strong>
              </div>
              <div>
                <span>GPS</span>
                <strong>
                  {gpsAccuracy!==null
                    ? gpsAccuracy<=20
                      ? "Excelente · ±"+Math.round(gpsAccuracy)+" m"
                      : gpsAccuracy<=50
                        ? "Bueno · ±"+Math.round(gpsAccuracy)+" m"
                        : "Débil · ±"+Math.round(gpsAccuracy)+" m"
                    : "Buscando…"}
                </strong>
              </div>
              <button
                type="button"
                className={followGps ? "active" : ""}
                onClick={recenterGpsCamera}
              >
                {followGps ? "◎ Siguiendo" : "◎ Recentrar"}
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
                  {gpsTestBusy
  ? "Probando…"
  : selected && canRoute
    ? "◎ Probar GPS e iniciar ruta"
    : "◎ Probar GPS"}
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

                  {canNavigateCommerce(business,source) ? (
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
                      <span>{formatManeuverDistance(nextCue.distanceMeters,deviceLocale.language)}</span>
                      <strong>{nextCue.instruction}</strong>
                    </div>
                  )}

                  {routeResult && (
                    <div className="navibori-route-summary">
                      <div>
                        <span>{deviceLocale.language==="en" ? "Remaining distance" : "Distancia restante"}</span>
                        <strong>{formatDistance(routeResult.distanceMeters)}</strong>
                      </div>
                      <div>
                        <span>{deviceLocale.language==="en" ? "Estimated time" : "Tiempo estimado"}</span>
                        <strong>{formatDuration(routeResult.durationSeconds)}</strong>
                      </div>
                      <div>
                        <span>{deviceLocale.language==="en" ? "Mode" : "Modo"}</span>
                        <strong>{routeModeIcon(routeResult.mode)} {routeModeLabel(routeResult.mode,deviceLocale.locale)}</strong>
                      </div>
                      {gpsActive && (
                        <div>
                          <span>GPS</span>
                          <strong>
                            {gpsAccuracy!==null
                              ? "±"+Math.round(gpsAccuracy)+" m"
                              : deviceLocale.language==="en" ? "Active" : "Activo"}
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
                        <span>{deviceLocale.language==="en" ? "Route directions" : "Indicaciones de la ruta"}</span>
                        <strong>
                          {directionsOpen
                            ? deviceLocale.language==="en" ? "Hide" : "Ocultar"
                            : routeResult.steps.length+" "+(
                                deviceLocale.language==="en" ? "steps" : "pasos"
                              )}
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
                                      ? deviceLocale.language==="en" ? "Destination" : "Destino"
                                      : deviceLocale.language==="en" ? "Continue" : "Continúa"}
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
                      <>
                        <a
                          href={appleDirectionUrl(routeResult?.mode ?? lastRouteMode)}
                          target="_blank"
                          rel="noreferrer"
                        >
                           Apple Maps / CarPlay
                        </a>
                        <a
                          href={directionUrl(routeResult?.mode ?? lastRouteMode)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Google Maps / Android Auto
                        </a>
                      </>
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
                  {!demoRoute && (
                    <small>
                      Para vehículos conectados, usa Apple Maps / CarPlay o Google Maps / Android Auto
                      como transferencia inmediata de la ruta. La integración nativa propia de NAVIBORI
                      con CarPlay y Android Auto requiere los clientes móviles nativos y las autorizaciones
                      de cada plataforma.
                    </small>
                  )}
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
