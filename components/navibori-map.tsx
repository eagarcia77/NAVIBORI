"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
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
import {localizeManeuver} from "@/lib/commerce/maneuver-localization";
import {canNavigateCommerce} from "@/lib/commerce/navigation-eligibility";
import {
  COMMERCE_MAP_REFRESH_MS,
  shouldRefreshCommerceMap
} from "@/lib/commerce/live-map-refresh";
import {chooseNavigationBearing} from "@/lib/commerce/navigation-sensor-fusion";
import {buildPhotonRouteGradient} from "@/lib/commerce/photon-corridor";
import {buildOrbitalLookahead} from "@/lib/commerce/orbital-lookahead";
import {
  deriveLagrangeCockpitPhase,
  lagrangePhaseLabel
} from "@/lib/commerce/lagrange-cockpit";
import {
  deriveExoDockState,
  exoDockCameraProfile,
  exoDockLabel
} from "@/lib/commerce/exodock";
import {
  adaptiveCameraProfile,
  buildTrajectoryPrediction,
  type TrajectoryPrediction,
  type TrajectoryRisk
} from "@/lib/commerce/trajectory-shield";
import {
  deriveVectorGatePhase,
  vectorGateGlyph,
  vectorGateHapticPattern,
  vectorGateLabel
} from "@/lib/commerce/vector-gate";
import {
  deriveFlightDirectorState,
  flightDirectorHapticPattern,
  flightDirectorLabel,
  type FlightDirectorPhase
} from "@/lib/commerce/astra-flight-director";
import {
  applyGravityLensToCamera,
  buildGravityLens,
  type GravityLensPhase
} from "@/lib/commerce/gravity-lens";
import {
  buildDriftBridgeEstimate,
  type DriftBridgeEstimate
} from "@/lib/commerce/astra-drift-bridge";
import {
  NAVIBORI_LOCALE_CHANGE_EVENT,
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
  {value:"bienestar",label:"Bienestar"},
  {value:"otros",label:"Otros"}
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
  if(!Number.isFinite(meters)||meters<0) return "—";
  if(meters<1000) return Math.round(meters)+" m";
  return (meters/1000).toFixed(1)+" km";
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
    case "walking": return "#008f63";
    case "cycling": return "#008f63";
    case "scooter": return "#e87916";
    default: return "#0878f9";
  }
}

function formatManeuverDistance(
  meters:number,
  language:"es"|"en"="es"
){
  if(meters<30) return language==="en" ? "Now" : "Ahora";
  const prefix=language==="en" ? "In " : "En ";
  if(language==="es"){
    if(meters<1000) return prefix+Math.max(10,Math.round(meters/10)*10)+" m";
    return prefix+(meters/1000).toFixed(1)+" km";
  }
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

function ensureRouteInfrastructure(map:maplibregl.Map){
  if(!map.isStyleLoaded()) return false;

  try{
    ensureRouteArrowImage(map);

    if(!map.getSource(ROUTE_SOURCE_ID)){
      map.addSource(ROUTE_SOURCE_ID,{
        type:"geojson",
        data:{
          type:"FeatureCollection",
          features:[]
        },
        lineMetrics:true
      });
    }

    if(!map.getLayer(ROUTE_GLOW_ID)){
      map.addLayer({
        id:ROUTE_GLOW_ID,
        type:"line",
        source:ROUTE_SOURCE_ID,
        layout:{
          "line-cap":"round",
          "line-join":"round"
        },
        paint:{
          "line-color":"#0a84ff",
          "line-width":24,
          "line-opacity":0.35,
          "line-blur":4
        }
      });
    }

    if(!map.getLayer(ROUTE_CASING_ID)){
      map.addLayer({
        id:ROUTE_CASING_ID,
        type:"line",
        source:ROUTE_SOURCE_ID,
        layout:{
          "line-cap":"round",
          "line-join":"round"
        },
        paint:{
          "line-color":"#10263b",
          "line-width":17,
          "line-opacity":0.98
        }
      });
    }

    if(!map.getLayer(ROUTE_LINE_ID)){
      map.addLayer({
        id:ROUTE_LINE_ID,
        type:"line",
        source:ROUTE_SOURCE_ID,
        layout:{
          "line-cap":"round",
          "line-join":"round"
        },
        paint:{
          "line-color":"#0a84ff",
          "line-width":11,
          "line-opacity":1
        }
      });
    }

    if(map.hasImage(ROUTE_ARROW_IMAGE_ID) && !map.getLayer(ROUTE_ARROW_ID)){
      map.addLayer({
        id:ROUTE_ARROW_ID,
        type:"symbol",
        source:ROUTE_SOURCE_ID,
        layout:{
          "symbol-placement":"line",
          "symbol-spacing":64,
          "icon-image":ROUTE_ARROW_IMAGE_ID,
          "icon-size":0.78,
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

    return true;
  }catch{
    return false;
  }
}

export default function NaviboriMap({
  businesses:initialBusinesses,
  source:initialSource,
  buildRevision
}:{
  businesses:CommerceProfile[];
  source:"live"|"demo";
  buildRevision:string;
}){
  const mapNode=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<maplibregl.Map|null>(null);
  const markersRef=useRef<maplibregl.Marker[]>([]);
  const userMarkerRef=useRef<maplibregl.Marker|null>(null);
  const nextTurnMarkerRef=useRef<maplibregl.Marker|null>(null);
  const destinationBeaconRef=useRef<maplibregl.Marker|null>(null);
  const photonCursorRef=useRef<maplibregl.Marker|null>(null);
  const orbitalTargetRef=useRef<maplibregl.Marker|null>(null);
  const trajectoryGhostRef=useRef<maplibregl.Marker|null>(null);
  const driftBridgeMarkerRef=useRef<maplibregl.Marker|null>(null);
  const deviceHeadingRef=useRef<number|null>(null);
  const orientationHandlerRef=useRef<((event:DeviceOrientationEvent)=>void)|null>(null);
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
  const lastTrajectoryRiskRef=useRef<TrajectoryRisk>("stable");
  const lastVectorGatePhaseRef=useRef<ReturnType<typeof deriveVectorGatePhase>>("cruise");
  const lastFlightDirectorPhaseRef=useRef<FlightDirectorPhase|null>(null);
  const lastGpsFixRef=useRef<{
    at:number;
    traveledMeters:number;
    speedKph:number|null;
    accuracyMeters:number|null;
  }|null>(null);
  const commerceRefreshInFlightRef=useRef(false);
  const deferredCommerceRefreshRef=useRef(false);
  const initialDemoBusinessesRef=useRef<CommerceProfile[]>(
    initialSource==="demo" ? initialBusinesses : []
  );

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
  const tr=(es:string,en:string)=>
    deviceLocale.language==="en" ? en : es;

  const [languageSource,setLanguageSource]=useState<"device"|"peripheral">("device");
  const [businesses,setBusinesses]=useState<CommerceProfile[]>(initialBusinesses);
  const [source,setSource]=useState<"live"|"demo">(initialSource);
  const [commerceRefreshState,setCommerceRefreshState]=useState<
    "idle"|"refreshing"|"updated"|"error"|"deferred"
  >("idle");
  const [lastCommerceRefreshAt,setLastCommerceRefreshAt]=useState<Date|null>(null);
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
  const [navigationBearingDegrees,setNavigationBearingDegrees]=useState<number|null>(null);
  const [trajectoryPrediction,setTrajectoryPrediction]=useState<TrajectoryPrediction|null>(null);
  const [gravityLensPhase,setGravityLensPhase]=useState<GravityLensPhase>("cruise");
  const [driftBridgeEstimate,setDriftBridgeEstimate]=useState<DriftBridgeEstimate|null>(null);
  const [astraCompassState,setAstraCompassState]=useState<
    "idle"|"active"|"blocked"|"unsupported"
  >("idle");
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
  const [diagnosticsCopyStatus,setDiagnosticsCopyStatus]=useState<"idle"|"success"|"error">("idle");
  const [searchTerm,setSearchTerm]=useState("");
  const [pendingNavigation,setPendingNavigation]=useState<{
    slug:string;
    mode:InMapRouteMode;
  }|null>(null);

  const refreshCommerce=useCallback(async(
    reason:"interval"|"foreground"|"manual"|"navigation-ended"="interval"
  )=>{
    if(typeof document==="undefined") return;

    if(gpsActiveRef.current){
      deferredCommerceRefreshRef.current=true;
      setCommerceRefreshState("deferred");
      return;
    }

    if(!shouldRefreshCommerceMap({
      visibility:document.visibilityState,
      gpsActive:gpsActiveRef.current,
      inFlight:commerceRefreshInFlightRef.current
    })){
      return;
    }

    commerceRefreshInFlightRef.current=true;
    setCommerceRefreshState("refreshing");

    try{
      const response=await fetch(
        "/api/commerce/public?reason="+encodeURIComponent(reason),
        {
          method:"GET",
          cache:"no-store",
          headers:{"Accept":"application/json"}
        }
      );

      if(!response.ok){
        throw new Error("commerce_refresh_failed");
      }

      const payload=await response.json() as {
        businesses?:CommerceProfile[];
        fetchedAt?:string;
      };

      const liveBusinesses=Array.isArray(payload.businesses)
        ? payload.businesses
        : [];

      if(liveBusinesses.length>0){
        setBusinesses(liveBusinesses);
        setSource("live");
      }else if(initialDemoBusinessesRef.current.length>0){
        setBusinesses(initialDemoBusinessesRef.current);
        setSource("demo");
      }else{
        setBusinesses([]);
        setSource("live");
      }

      const fetchedAt=payload.fetchedAt
        ? new Date(payload.fetchedAt)
        : new Date();

      setLastCommerceRefreshAt(
        Number.isNaN(fetchedAt.getTime()) ? new Date() : fetchedAt
      );
      deferredCommerceRefreshRef.current=false;
      setCommerceRefreshState("updated");
    }catch{
      setCommerceRefreshState("error");
    }finally{
      commerceRefreshInFlightRef.current=false;
    }
  },[]);

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

  const vectorGateState=deriveVectorGatePhase(
    nextCue?.distanceMeters ?? null
  );

  const orbitalLookahead=useMemo(
    ()=>routeResult && navigationProgress
      ? buildOrbitalLookahead(
          routeResult,
          navigationProgress.traveledMeters,
          routeResult.mode,
          gpsSpeedKph,
          nextCue?.distanceMeters ?? null
        )
      : null,
    [
      gpsSpeedKph,
      navigationProgress?.traveledMeters,
      nextCue?.distanceMeters,
      routeResult
    ]
  );

  const flightDirectorRouteBearing=useMemo(
    ()=>routeResult
      ? getRouteBearingNearPoint(
          routeResult,
          orbitalLookahead?.coordinate ?? userLocation ?? navigationProgress?.snapped ?? {
            latitude:routeResult.geometry.coordinates[0]?.[1] ?? 0,
            longitude:routeResult.geometry.coordinates[0]?.[0] ?? 0
          }
        )
      : null,
    [
      navigationProgress?.snapped.latitude,
      navigationProgress?.snapped.longitude,
      orbitalLookahead?.coordinate.latitude,
      orbitalLookahead?.coordinate.longitude,
      routeResult,
      userLocation?.latitude,
      userLocation?.longitude
    ]
  );

  const flightDirectorState=useMemo(
    ()=>deriveFlightDirectorState({
      routeBearing:flightDirectorRouteBearing,
      navigationBearing:navigationBearingDegrees,
      routeDeviationMeters:navigationProgress?.distanceFromRouteMeters ?? null,
      gpsAccuracyMeters:gpsAccuracy,
      speedKph:gpsSpeedKph
    }),
    [
      flightDirectorRouteBearing,
      gpsAccuracy,
      gpsSpeedKph,
      navigationBearingDegrees,
      navigationProgress?.distanceFromRouteMeters
    ]
  );

  const lagrangePhase=useMemo(
    ()=>deriveLagrangeCockpitPhase({
      gpsActive,
      arrived,
      nextManeuverMeters:nextCue?.distanceMeters ?? null,
      remainingMeters:navigationProgress?.remainingMeters ?? null,
      trajectoryRisk:trajectoryPrediction?.risk ?? "stable"
    }),
    [
      arrived,
      gpsActive,
      navigationProgress?.remainingMeters,
      nextCue?.distanceMeters,
      trajectoryPrediction?.risk
    ]
  );

  const exoDockState=useMemo(
    ()=>deriveExoDockState({
      gpsActive,
      arrived,
      remainingMeters:navigationProgress?.remainingMeters ?? null
    }),
    [
      arrived,
      gpsActive,
      navigationProgress?.remainingMeters
    ]
  );

  useEffect(()=>{
    if(exoDockState==="inactive") return;

    const haptics=navigator as Navigator & {
      vibrate?:(pattern:number|number[])=>boolean;
    };

    if(exoDockState==="acquire"){
      haptics.vibrate?.(28);
    }else if(exoDockState==="align"){
      haptics.vibrate?.([32,45,32]);
    }else if(exoDockState==="dock"){
      haptics.vibrate?.([55,35,85]);
    }
  },[exoDockState]);

  useEffect(()=>{
    if(!gpsActive) return;
    if(lastVectorGatePhaseRef.current===vectorGateState) return;

    lastVectorGatePhaseRef.current=vectorGateState;
    const pattern=vectorGateHapticPattern(vectorGateState);
    if(pattern===null) return;

    const haptics=navigator as Navigator & {
      vibrate?:(pattern:number|number[])=>boolean;
    };
    haptics.vibrate?.(pattern);
  },[gpsActive,vectorGateState]);

  useEffect(()=>{
    if(!gpsActive){
      lastFlightDirectorPhaseRef.current=null;
      return;
    }

    const previous=lastFlightDirectorPhaseRef.current;
    const next=flightDirectorState.phase;
    lastFlightDirectorPhaseRef.current=next;

    if(document.documentElement.dataset.motion==="reduced") return;

    const pattern=flightDirectorHapticPattern(previous,next);
    if(pattern===null) return;

    const haptics=navigator as Navigator & {
      vibrate?:(pattern:number|number[])=>boolean;
    };
    haptics.vibrate?.(pattern);
  },[flightDirectorState.phase,gpsActive]);

  useEffect(()=>{
    const clearEstimate=()=>{
      setDriftBridgeEstimate(null);
      driftBridgeMarkerRef.current?.remove();
      driftBridgeMarkerRef.current=null;
    };

    if(!gpsActive || !routeResult){
      clearEstimate();
      return;
    }

    const tick=()=>{
      const route=routeResultRef.current;
      const fix=lastGpsFixRef.current;
      if(!route || !fix){
        clearEstimate();
        return;
      }

      const estimate=buildDriftBridgeEstimate(
        route,
        fix.traveledMeters,
        fix.speedKph,
        Date.now()-fix.at,
        fix.accuracyMeters
      );

      if(estimate.phase==="inactive"){
        clearEstimate();
        return;
      }

      setDriftBridgeEstimate(estimate);

      if(estimate.phase!=="holding" || !estimate.coordinate){
        driftBridgeMarkerRef.current?.remove();
        driftBridgeMarkerRef.current=null;
        return;
      }

      const map=mapRef.current;
      if(!map) return;

      if(!driftBridgeMarkerRef.current){
        const element=document.createElement("div");
        element.className="navibori-drift-bridge-marker";
        element.setAttribute(
          "aria-label",
          tr(
            "Posición estimada temporalmente por ASTRA Drift Bridge",
            "Position temporarily estimated by ASTRA Drift Bridge"
          )
        );
        element.innerHTML="<span>DR</span><i></i>";
        driftBridgeMarkerRef.current=new maplibregl.Marker({
          element,
          anchor:"center"
        }).addTo(map);
      }

      driftBridgeMarkerRef.current.setLngLat([
        estimate.coordinate.longitude,
        estimate.coordinate.latitude
      ]);

      if(
        followGpsRef.current &&
        document.documentElement.dataset.motion!=="reduced"
      ){
        const bearing=getRouteBearingNearPoint(route,estimate.coordinate);
        map.easeTo({
          center:[
            estimate.coordinate.longitude,
            estimate.coordinate.latitude
          ],
          bearing:bearing ?? map.getBearing(),
          duration:420,
          essential:false
        });
      }
    };

    tick();
    const interval=window.setInterval(tick,500);

    return ()=>{
      window.clearInterval(interval);
      clearEstimate();
    };
  },[gpsActive,routeResult]);

  useEffect(()=>{
    const handleForeground=()=>{
      if(document.visibilityState==="visible"){
        void refreshCommerce("foreground");
      }
    };

    const interval=window.setInterval(()=>{
      void refreshCommerce("interval");
    },COMMERCE_MAP_REFRESH_MS);

    document.addEventListener("visibilitychange",handleForeground);
    window.addEventListener("pageshow",handleForeground);

    return ()=>{
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange",handleForeground);
      window.removeEventListener("pageshow",handleForeground);
    };
  },[refreshCommerce]);

  useEffect(()=>{
    if(
      !gpsActive &&
      deferredCommerceRefreshRef.current &&
      document.visibilityState==="visible"
    ){
      deferredCommerceRefreshRef.current=false;
      void refreshCommerce("navigation-ended");
    }
  },[gpsActive,refreshCommerce]);

  useEffect(()=>{
    const applyLocale=()=>{
      const locale=browserNaviboriLocale();
      setDeviceLocale(locale);
      document.documentElement.lang=locale.locale;
      setLanguageSource(
        document.documentElement.dataset.peripheralLocale
          ? "peripheral"
          : "device"
      );
    };

    applyLocale();
    window.addEventListener("languagechange",applyLocale);
    window.addEventListener(NAVIBORI_LOCALE_CHANGE_EVENT,applyLocale);

    return ()=>{
      window.removeEventListener("languagechange",applyLocale);
      window.removeEventListener(NAVIBORI_LOCALE_CHANGE_EVENT,applyLocale);
    };
  },[]);

  useEffect(()=>{
    const ctor=window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?:()=>Promise<"granted"|"denied">;
    };

    if(!ctor){
      setAstraCompassState("unsupported");
      return;
    }

    if(typeof ctor.requestPermission==="function"){
      return;
    }

    const handler=(event:DeviceOrientationEvent)=>{
      const extended=event as DeviceOrientationEvent & {
        webkitCompassHeading?:number;
      };

      const heading=
        typeof extended.webkitCompassHeading==="number" &&
        Number.isFinite(extended.webkitCompassHeading)
          ? extended.webkitCompassHeading
          : event.absolute &&
            typeof event.alpha==="number" &&
            Number.isFinite(event.alpha)
              ? 360-event.alpha
              : null;

      if(heading!==null){
        deviceHeadingRef.current=heading;
        setAstraCompassState("active");
      }
    };

    orientationHandlerRef.current=handler;
    window.addEventListener("deviceorientationabsolute",handler as EventListener,true);
    window.addEventListener("deviceorientation",handler,true);

    return ()=>{
      window.removeEventListener("deviceorientationabsolute",handler as EventListener,true);
      window.removeEventListener("deviceorientation",handler,true);
      orientationHandlerRef.current=null;
    };
  },[]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map || !mapReady) return;

    nextTurnMarkerRef.current?.remove();
    nextTurnMarkerRef.current=null;
    destinationBeaconRef.current?.remove();
    destinationBeaconRef.current=null;
    photonCursorRef.current?.remove();
    photonCursorRef.current=null;
    orbitalTargetRef.current?.remove();
    orbitalTargetRef.current=null;
    trajectoryGhostRef.current?.remove();
    trajectoryGhostRef.current=null;

    if(routeResult && selected?.mapLocation){
      const element=document.createElement("div");
      element.className="navibori-holo-destination exodock-"+exoDockState;
      element.setAttribute(
        "aria-label",
        tr("Destino de navegación","Navigation destination")
      );
      element.innerHTML="<span></span>";
      destinationBeaconRef.current=new maplibregl.Marker({
        element,
        anchor:"center"
      })
        .setLngLat([
          selected.mapLocation.longitude,
          selected.mapLocation.latitude
        ])
        .addTo(map);
    }

    const turnLocation=nextCue?.step.location;
    if(gpsActive && turnLocation){
      const element=document.createElement("div");
      element.className=
        "navibori-holo-turn vector-gate-map "+vectorGateState;
      element.dataset.phase=vectorGateState;

      const phaseLabel=vectorGateLabel(
        vectorGateState,
        deviceLocale.language
      );
      const distanceLabel=formatManeuverDistance(
        nextCue?.distanceMeters ?? 0,
        deviceLocale.language
      );

      element.setAttribute(
        "aria-label",
        tr(
          "Próximo giro · "+phaseLabel+" · "+distanceLabel,
          "Next turn · "+phaseLabel+" · "+distanceLabel
        )
      );

      const frame=document.createElement("span");
      frame.className="vector-gate-frame";

      const glyph=document.createElement("i");
      glyph.className="vector-gate-glyph";
      glyph.textContent=vectorGateGlyph(nextCue?.step.modifier);

      const phase=document.createElement("em");
      phase.className="vector-gate-phase";
      phase.textContent=phaseLabel;

      const distance=document.createElement("b");
      distance.className="vector-gate-distance";
      distance.textContent=distanceLabel;

      element.append(frame,glyph,phase,distance);

      nextTurnMarkerRef.current=new maplibregl.Marker({
        element,
        anchor:"center"
      })
        .setLngLat([
          turnLocation.longitude,
          turnLocation.latitude
        ])
        .addTo(map);
    }

    if(gpsActive && navigationProgress){
      const element=document.createElement("div");
      element.className="navibori-photon-cursor";
      element.setAttribute(
        "aria-label",
        tr("Posición sobre Photon Corridor","Position on Photon Corridor")
      );
      element.innerHTML="<span></span><i></i>";
      photonCursorRef.current=new maplibregl.Marker({
        element,
        anchor:"center"
      })
        .setLngLat([
          navigationProgress.snapped.longitude,
          navigationProgress.snapped.latitude
        ])
        .addTo(map);
    }

    if(gpsActive && orbitalLookahead){
      const element=document.createElement("div");
      element.className="navibori-orbital-target";
      element.setAttribute(
        "aria-label",
        tr(
          "Punto de anticipación Orbital Lookahead",
          "Orbital Lookahead guidance target"
        )
      );
      element.innerHTML="<span></span><i></i>";
      orbitalTargetRef.current=new maplibregl.Marker({
        element,
        anchor:"center"
      })
        .setLngLat([
          orbitalLookahead.coordinate.longitude,
          orbitalLookahead.coordinate.latitude
        ])
        .addTo(map);
    }

    if(
      gpsActive &&
      trajectoryPrediction &&
      trajectoryPrediction.risk!=="stable"
    ){
      const element=document.createElement("div");
      element.className=
        "navibori-trajectory-ghost "+trajectoryPrediction.risk;
      element.setAttribute(
        "aria-label",
        tr(
          "Posición proyectada por Trajectory Shield",
          "Trajectory Shield projected position"
        )
      );
      element.innerHTML="<span></span><i></i>";
      trajectoryGhostRef.current=new maplibregl.Marker({
        element,
        anchor:"center"
      })
        .setLngLat([
          trajectoryPrediction.futureCoordinate.longitude,
          trajectoryPrediction.futureCoordinate.latitude
        ])
        .addTo(map);
    }

    return ()=>{
      nextTurnMarkerRef.current?.remove();
      nextTurnMarkerRef.current=null;
      destinationBeaconRef.current?.remove();
      destinationBeaconRef.current=null;
      photonCursorRef.current?.remove();
      photonCursorRef.current=null;
      orbitalTargetRef.current?.remove();
      orbitalTargetRef.current=null;
      trajectoryGhostRef.current?.remove();
      trajectoryGhostRef.current=null;
    };
  },[
    gpsActive,
    mapReady,
    nextCue?.step.location?.latitude,
    nextCue?.step.location?.longitude,
    nextCue?.step.modifier,
    nextCue?.distanceMeters,
    vectorGateState,
    deviceLocale.language,
    navigationProgress?.snapped.latitude,
    navigationProgress?.snapped.longitude,
    orbitalLookahead?.coordinate.latitude,
    orbitalLookahead?.coordinate.longitude,
    trajectoryPrediction?.futureCoordinate.latitude,
    trajectoryPrediction?.futureCoordinate.longitude,
    trajectoryPrediction?.risk,
    routeResult,
    selected?.mapLocation?.latitude,
    selected?.mapLocation?.longitude
  ]);

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
      ensureRouteInfrastructure(map);
      setBasemapState("ready");
      setMapReady(true);
    });

    map.on("styledata",()=>{
      if(
        map.isStyleLoaded() &&
        (
          !map.getSource(ROUTE_SOURCE_ID) ||
          !map.getLayer(ROUTE_LINE_ID)
        )
      ){
        ensureRouteInfrastructure(map);
      }
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
        tr(
          "Vista libre · el GPS sigue activo y la ruta continúa recalculándose.",
          "Free map view · GPS remains active and the route keeps recalculating."
        )
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
      nextTurnMarkerRef.current?.remove();
      destinationBeaconRef.current?.remove();
      photonCursorRef.current?.remove();
      orbitalTargetRef.current?.remove();
      trajectoryGhostRef.current?.remove();
      driftBridgeMarkerRef.current?.remove();
      driftBridgeMarkerRef.current=null;
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
      element.setAttribute(
        "aria-label",
        (deviceLocale.language==="en" ? "View " : "Ver ")+
        business.name+
        (deviceLocale.language==="en" ? " on map" : " en el mapa")
      );
      element.title=business.name;

      const initial=document.createElement("span");
      initial.textContent=business.slug===selectedSlug
        ? "◎"
        : business.name.slice(0,1).toUpperCase();
      element.appendChild(initial);

      if(business.slug===selectedSlug){
        const destinationLabel=document.createElement("small");
        destinationLabel.className="business-map-destination-label";
        destinationLabel.textContent=copy.destination;
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
  },[
    mappedBusinesses,
    mapReady,
    routeResult,
    selectedSlug,
    copy.destination,
    deviceLocale.language
  ]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map || !mapReady) return;

    if(!routeResult){
      ensureRouteInfrastructure(map);
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
      return drawRouteOnMap(
        routeResult,
        navigationProgress?.progressRatio ?? 0
      );
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
      // The foreground GPS tracker owns the adaptive camera during navigation.
      // Avoid a competing easeTo() here, which resets its look-ahead and zoom.
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
  },[
    followGps,
    gpsActive,
    mapReady,
    navigationProgress?.progressRatio,
    routeResult,
    userLocation
  ]);

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
          ? tr(
            "Este comercio todavía no tiene una ubicación LIVE verificada para navegación.",
            "This business does not yet have a verified LIVE location for navigation."
          )
          : tr(
            "Este destino DEMO no tiene coordenadas válidas para probar navegación.",
            "This DEMO destination does not have valid coordinates for navigation testing."
          )
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
    element.setAttribute("aria-label",tr("Tu ubicación GPS","Your GPS location"));
    const dot=document.createElement("span");
    element.appendChild(dot);

    userMarkerRef.current=new maplibregl.Marker({element})
      .setLngLat([next.longitude,next.latitude])
      .addTo(map);
  }

  function drawRouteOnMap(
    route:InMapRouteResult,
    progressRatio=0
  ){
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
      if(!ensureRouteInfrastructure(map)){
        return false;
      }

      const source=map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;
      if(!source) return false;

      source.setData(feature);

      const color=routeLineColor(route.mode);
      // Reassert a high-contrast continuous route on every GPS progress update.
      map.setLayoutProperty(ROUTE_GLOW_ID,"visibility","visible");
      map.setLayoutProperty(ROUTE_CASING_ID,"visibility","visible");
      map.setLayoutProperty(ROUTE_LINE_ID,"visibility","visible");
      map.setPaintProperty(ROUTE_CASING_ID,"line-color","#ffffff");
      map.setPaintProperty(ROUTE_GLOW_ID,"line-color",color);
      map.setPaintProperty(
        ROUTE_GLOW_ID,
        "line-opacity",
        gpsActiveRef.current ? 0.42 : 0.28
      );
      map.setPaintProperty(
        ROUTE_LINE_ID,
        "line-gradient",
        buildPhotonRouteGradient(
          progressRatio,
          color
        ) as maplibregl.ExpressionSpecification
      );

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
        tr(
          "Vista de ruta completa · el GPS sigue activo y la ruta continúa recalculándose.",
          "Full route view · GPS remains active and the route keeps recalculating."
        )
      );
    }

    map.fitBounds(bounds,{
      padding:{top:70,right:70,bottom:220,left:70},
      maxZoom:17,
      duration:650
    });
  }

  async function enableAstraCompass(){
    const ctor=window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?:()=>Promise<"granted"|"denied">;
    };

    if(!ctor){
      setAstraCompassState("unsupported");
      setLocationStatus(
        tr(
          "La orientación avanzada no está disponible en este dispositivo.",
          "Advanced orientation is not available on this device."
        )
      );
      return;
    }

    if(typeof ctor.requestPermission==="function"){
      try{
        const permission=await ctor.requestPermission();
        if(permission!=="granted"){
          setAstraCompassState("blocked");
          setLocationStatus(
            tr(
              "Permiso de orientación no concedido; NAVIBORI continuará con GPS + rumbo de ruta.",
              "Orientation permission was not granted; NAVIBORI will continue with GPS + route bearing."
            )
          );
          return;
        }
      }catch{
        setAstraCompassState("blocked");
        return;
      }
    }

    if(orientationHandlerRef.current){
      setAstraCompassState("active");
      return;
    }

    const handler=(event:DeviceOrientationEvent)=>{
      const extended=event as DeviceOrientationEvent & {
        webkitCompassHeading?:number;
      };
      const heading=
        typeof extended.webkitCompassHeading==="number" &&
        Number.isFinite(extended.webkitCompassHeading)
          ? extended.webkitCompassHeading
          : event.absolute &&
            typeof event.alpha==="number" &&
            Number.isFinite(event.alpha)
              ? 360-event.alpha
              : null;

      if(heading!==null){
        deviceHeadingRef.current=heading;
        setAstraCompassState("active");
      }
    };

    orientationHandlerRef.current=handler;
    window.addEventListener("deviceorientationabsolute",handler as EventListener,true);
    window.addEventListener("deviceorientation",handler,true);
    setAstraCompassState("active");
  }

  function recenterGpsCamera(){
    if(!userLocation) return;

    followGpsRef.current=true;
    setFollowGps(true);

    const activeMode=activeNavigationModeRef.current;
    const target=orbitalLookahead?.coordinate ?? userLocation;
    mapRef.current?.easeTo({
      center:[target.longitude,target.latitude],
      zoom:Math.max(mapRef.current?.getZoom() ?? 16,16.8),
      offset:[0,orbitalLookahead ? 130 : 110],
      pitch:
        activeMode==="driving"
          ? 42
          : activeMode==="walking"
            ? 15
            : 28,
      duration:450
    });

    setLocationStatus(
      tr("Seguimiento visual GPS reactivado.","GPS camera follow restored.")+
      (gpsAccuracy!==null ? " Precisión ±"+Math.round(gpsAccuracy)+" m." : "")
    );
  }

  function geolocationErrorMessage(error:GeolocationPositionError){
    if(error.code===error.PERMISSION_DENIED){
      return tr(
        "Permiso de ubicación denegado. Activa Localización para NAVIBORI/Safari y vuelve a intentar.",
        "Location permission denied. Enable Location for NAVIBORI/Safari and try again."
      );
    }
    if(error.code===error.POSITION_UNAVAILABLE){
      return "El dispositivo no pudo determinar tu ubicación. Activa Localización, Wi‑Fi o datos móviles y vuelve a intentar.";
    }
    return tr(
      "El GPS tardó demasiado en responder. Intenta nuevamente en un lugar con mejor señal.",
      "GPS took too long to respond. Try again where signal is stronger."
    );
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
      detail:tr("Verificando motor de rutas…","Checking routing engine…")
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
        detail:tr("No se pudo comprobar el motor de rutas.","The routing engine could not be checked.")
      });
    }
  }

  function testGps(){
    if(!window.isSecureContext){
      setNavigationPhase("error");
      setLocationStatus(tr("El GPS requiere una conexión HTTPS segura.","GPS requires a secure HTTPS connection."));
      return;
    }
    if(!navigator.geolocation){
      setLocationStatus(tr(
      "Este dispositivo o navegador no ofrece geolocalización.",
      "This device or browser does not provide geolocation."
    ));
      return;
    }

    setGpsTestBusy(true);
    setLocationStatus(tr("Probando GPS del dispositivo…","Testing device GPS…"));

    const success=(position:GeolocationPosition)=>{
      const next={
        latitude:position.coords.latitude,
        longitude:position.coords.longitude
      };

      if(!validRouteCoordinate(next)){
        setGpsTestBusy(false);
        setLocationStatus(tr("El navegador devolvió una ubicación inválida.","The browser returned an invalid location."));
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
        (selected && canRoute ? tr("✓ GPS funcionando · iniciando ruta","✓ GPS working · starting route") : tr("✓ GPS funcionando · selecciona un comercio","✓ GPS working · select a business"))+
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

    setLocationStatus(tr("Buscando tu ubicación…","Finding your location…"));
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
        setLocationStatus(tr(
          "Tu ubicación está activa solo durante esta sesión.",
          "Your location is active only during this session."
        ));
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
          tr(
      "No se pudo acceder a tu ubicación. Verifica el permiso de ubicación del navegador.",
      "Your location could not be accessed. Check the browser location permission."
    )
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
        throw new Error("error" in data && data.error ? data.error : tr("No se encontró una ruta.","No route was found."));
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
            : tr("No se pudo calcular la ruta.","The route could not be calculated.")
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
    setTrajectoryPrediction(null);
    setGravityLensPhase("cruise");
    setDriftBridgeEstimate(null);
    lastGpsFixRef.current=null;
    driftBridgeMarkerRef.current?.remove();
    driftBridgeMarkerRef.current=null;
    lastTrajectoryRiskRef.current="stable";
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
      setLocationStatus(tr("El GPS requiere una conexión HTTPS segura.","GPS requires a secure HTTPS connection."));
      return;
    }

    if(!navigator.geolocation){
      setNavigationPhase("error");
      setLocationStatus(tr(
      "Este dispositivo o navegador no ofrece GPS/geolocalización.",
      "This device or browser does not provide GPS/geolocation."
    ));
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
    setLocationStatus(tr("Conectando con tu GPS…","Connecting to your GPS…"));

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
        setLocationStatus(tr(
          "El GPS devolvió una ubicación inválida. Intenta nuevamente.",
          "GPS returned an invalid location. Try again."
        ));
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

      const speedKphNow=
        speed!==null
          ? Math.max(0,speed*3.6)
          : gpsSpeedKph;

      setGpsSpeedKph(
        speedKphNow!==null
          ? Math.max(0,Math.round(speedKphNow))
          : null
      );

      const cameraRoute=routeResultRef.current;
      const cameraProgress=
        cameraRoute
          ? getNavigationProgress(cameraRoute,next)
          : null;

      setDriftBridgeEstimate(null);
      driftBridgeMarkerRef.current?.remove();
      driftBridgeMarkerRef.current=null;

      if(cameraRoute && cameraProgress){
        lastGpsFixRef.current={
          at:Date.now(),
          traveledMeters:cameraProgress.traveledMeters,
          speedKph:speedKphNow,
          accuracyMeters:accuracy
        };
      }else{
        lastGpsFixRef.current=null;
      }
      const cameraCue=
        cameraRoute && cameraProgress
          ? getNavigationCueAtProgress(
              cameraRoute,
              cameraProgress.traveledMeters
            )
          : null;
      const cameraLookahead=
        cameraRoute && cameraProgress
          ? buildOrbitalLookahead(
              cameraRoute,
              cameraProgress.traveledMeters,
              activeMode,
              speedKphNow,
              cameraCue?.distanceMeters ?? null
            )
          : null;

      const liveDockState=deriveExoDockState({
        gpsActive:true,
        arrived:false,
        remainingMeters:cameraProgress?.remainingMeters ?? null
      });

      const gravityLens=
        liveDockState==="inactive"
          ? buildGravityLens({
              baseCoordinate:cameraLookahead?.coordinate ?? next,
              maneuverCoordinate:cameraCue?.step.location ?? null,
              maneuverDistanceMeters:cameraCue?.distanceMeters ?? null,
              mode:activeMode,
              speedKph:speedKphNow,
              reducedMotion:
                document.documentElement.dataset.motion==="reduced"
            })
          : buildGravityLens({
              baseCoordinate:cameraLookahead?.coordinate ?? next,
              maneuverCoordinate:null,
              maneuverDistanceMeters:null,
              mode:activeMode,
              speedKph:speedKphNow,
              reducedMotion:
                document.documentElement.dataset.motion==="reduced"
            });

      setGravityLensPhase(gravityLens.phase);

      const cameraCenter=gravityLens.center;
      const routeBearingPoint=cameraLookahead?.coordinate ?? next;
      const routeHeading=
        cameraRoute
          ? getRouteBearingNearPoint(
              cameraRoute,
              routeBearingPoint
            )
          : null;
      const navigationBearing=chooseNavigationBearing({
        gpsHeading:heading,
        speedKph:speedKphNow,
        deviceHeading:deviceHeadingRef.current,
        routeHeading
      });
      setNavigationBearingDegrees(navigationBearing);

      const prediction=
        cameraRoute
          ? buildTrajectoryPrediction(
              cameraRoute,
              next,
              navigationBearing,
              speedKphNow,
              accuracy
            )
          : null;

      setTrajectoryPrediction(prediction);

      const risk=prediction?.risk ?? "stable";
      if(
        risk==="warning" &&
        lastTrajectoryRiskRef.current!=="warning"
      ){
        const haptics=navigator as Navigator & {
          vibrate?:(pattern:number|number[])=>boolean;
        };
        haptics.vibrate?.([45,35,45]);
        setRouteStatus(
          tr(
            "Trajectory Shield · posible desvío detectado. Alinea con el corredor.",
            "Trajectory Shield · possible drift detected. Align with the corridor."
          )
        );
      }
      lastTrajectoryRiskRef.current=risk;

      const baseCameraProfile=
        exoDockCameraProfile(liveDockState,activeMode) ??
        adaptiveCameraProfile(
          activeMode,
          speedKphNow,
          cameraCue?.distanceMeters ?? null,
          risk
        );

      const cameraProfile=
        liveDockState==="inactive"
          ? applyGravityLensToCamera(baseCameraProfile,gravityLens)
          : baseCameraProfile;

      if(followGpsRef.current){
        const map=mapRef.current;
        map?.easeTo({
          center:[cameraCenter.longitude,cameraCenter.latitude],
          zoom:cameraProfile.zoom,
          offset:[0,cameraProfile.offsetY],
          bearing:
            navigationBearing ??
            map?.getBearing() ??
            0,
          pitch:cameraProfile.pitch,
          duration:firstFix ? 650 : cameraProfile.duration
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
          setRouteStatus(tr("Fuera de ruta · recalculando…","Off route · recalculating…"));
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
        setLocationStatus(tr("Destino alcanzado · GPS detenido.","Destination reached · GPS stopped."));
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
      setLocationStatus(tr(
        "GPS de alta precisión no respondió · probando ubicación aproximada…",
        "High-accuracy GPS did not respond · trying approximate location…"
      ));
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
        tr(
        "No llegó una posición GPS. Pulsa “Reintentar GPS” o abre ☰ > Diagnosticar GPS y rutas.",
        "No GPS position was received. Tap “Retry GPS” or open ☰ > Diagnose GPS and routes."
      )
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
    setTrajectoryPrediction(null);
    lastTrajectoryRiskRef.current="stable";
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
    <section
      className="map-panel spatial-cockpit full-map-cockpit"
      data-cockpit-phase={lagrangePhase}
      data-exodock-state={exoDockState}
      data-gravity-lens={gravityLensPhase}
      aria-label={tr("Mapa de comercios NAVIBORI","NAVIBORI business map")}
    >
      <div className="map-stage full-map-stage">
        <div ref={mapNode} className="map-canvas full-map-canvas" />

        <button
          type="button"
          className={"full-map-gps-button "+(gpsActive ? "active" : "")}
          aria-label={
            gpsActive
              ? tr("Recentrar GPS","Recenter GPS")
              : tr("Probar GPS","Test GPS")
          }
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
          aria-label={
            menuOpen
              ? tr("Cerrar menú","Close menu")
              : tr("Abrir menú","Open menu")
          }
          aria-expanded={menuOpen}
          onClick={()=>setMenuOpen((open)=>!open)}
        >
          {menuOpen ? "×" : "☰"}
        </button>

        {navigationPhase!=="idle" && selected && (
          <div className={"navibori-navigation-phase "+navigationPhase} aria-live="polite">
            <span className={navigationPhase==="permission"||navigationPhase==="gps"||navigationPhase==="routing"||navigationPhase==="navigating" ? "done" : ""}>{copy.permissionStep}</span>
            <span className={navigationPhase==="gps"||navigationPhase==="routing"||navigationPhase==="navigating" ? "done" : ""}>{copy.gpsStep}</span>
            <span className={navigationPhase==="routing"||navigationPhase==="navigating" ? "done" : ""}>{copy.routeStep}</span>
            <span className={navigationPhase==="navigating" ? "done" : ""}>{copy.navigatingStep}</span>
            {navigationPhase==="error" && (
              <button
                type="button"
                onClick={()=>startGpsNavigation(lastRouteMode)}
              >
                {copy.retryGps}
              </button>
            )}
          </div>
        )}

        {gpsActive && routeResult && selected && (
          <aside
            className={
              "navibori-navigation-hud lagrange-phase-"+lagrangePhase
            }
            data-lagrange-phase={lagrangePhase}
            data-exodock-state={exoDockState}
            aria-live="polite"
          >
            <div className={"navibori-navigation-maneuver vector-gate-"+vectorGateState}>
              <div
                className={"lagrange-cockpit-chip "+lagrangePhase}
                aria-label={tr(
                  "Fase adaptativa Lagrange",
                  "Lagrange adaptive phase"
                )}
              >
                <span>◈ LAGRANGE</span>
                <strong>
                  {lagrangePhaseLabel(
                    lagrangePhase,
                    deviceLocale.language
                  )}
                </strong>
              </div>
              {exoDockState!=="inactive" && (
                <div
                  className={"exodock-chip "+exoDockState}
                  aria-label={tr(
                    "Sistema de aproximación final EXODOCK",
                    "EXODOCK final approach system"
                  )}
                >
                  <span>◇ EXODOCK</span>
                  <strong>
                    {exoDockLabel(exoDockState,deviceLocale.language)}
                    {navigationProgress
                      ? " · "+Math.max(
                          0,
                          Math.round(navigationProgress.remainingMeters)
                        )+" m"
                      : ""}
                  </strong>
                </div>
              )}
              <span>
                {nextCue
                  ? formatManeuverDistance(
                      nextCue.distanceMeters,
                      deviceLocale.language
                    )
                  : routeModeIcon(routeResult.mode)}
              </span>
              <strong>
                {(nextCue?.instruction ? localizeManeuver(nextCue.instruction,deviceLocale.language) : null) ?? (
                  deviceLocale.language==="en"
                    ? "Follow the highlighted route."
                    : "Sigue la ruta marcada."
                )}
              </strong>
              <small>{selected.name}</small>
              <div className="astranav-chip">
                <span>✦ ASTRANAV</span>
                <strong>
                  {astraCompassState==="active"
                    ? tr("FUSIÓN DE SENSORES","SENSOR FUSION")
                    : tr("FUSIÓN DE RUTA","ROUTE FUSION")}
                </strong>
              </div>

              {gpsActive && (
                <div
                  className={"astra-flight-director "+flightDirectorState.phase}
                  aria-label={tr(
                    "Director de vuelo Astra · "+
                      flightDirectorLabel(flightDirectorState,"es"),
                    "Astra Flight Director · "+
                      flightDirectorLabel(flightDirectorState,"en")
                  )}
                >
                  <div>
                    <span>ASTRA FD</span>
                    <strong>
                      {flightDirectorLabel(
                        flightDirectorState,
                        deviceLocale.language
                      )}
                    </strong>
                    <small>
                      {flightDirectorState.bearingErrorDegrees!==null
                        ? "Δ "+
                          Math.round(
                            Math.abs(flightDirectorState.bearingErrorDegrees)
                          )+
                          "°"
                        : "Δ —"}
                      {" · "}
                      XTE ~
                      {flightDirectorState.deviationMeters!==null
                        ? Math.round(flightDirectorState.deviationMeters)
                        : "—"}
                      {" m · "}
                      {flightDirectorState.confidence}%
                    </small>
                  </div>
                  <div className="astra-flight-director-reticle" aria-hidden="true">
                    <i />
                    <b
                      style={{
                        transform:
                          "translateX("+
                          Math.round(flightDirectorState.cueOffset*34)+
                          "px)"
                      }}
                    />
                  </div>
                </div>
              )}

              {driftBridgeEstimate && driftBridgeEstimate.phase!=="inactive" && (
                <div
                  className={"astra-drift-bridge-chip "+driftBridgeEstimate.phase}
                  aria-live="polite"
                  aria-label={tr(
                    "Puente inercial ASTRA",
                    "ASTRA inertial bridge"
                  )}
                >
                  <span>ASTRA DRIFT BRIDGE</span>
                  <strong>
                    {driftBridgeEstimate.phase==="holding"
                      ? tr("DR HOLD","DR HOLD")
                      : tr("FIX GPS PERDIDO","GPS FIX LOST")}
                  </strong>
                  <small>
                    {(driftBridgeEstimate.elapsedMs/1000).toFixed(1)} s
                    {" · "}
                    {driftBridgeEstimate.phase==="holding"
                      ? driftBridgeEstimate.confidence+"%"
                      : "0%"}
                  </small>
                </div>
              )}

              {orbitalLookahead && (
                <div
                  className="orbital-lookahead-chip"
                  aria-label={tr(
                    "Horizonte predictivo Orbital Lookahead",
                    "Orbital Lookahead predictive horizon"
                  )}
                >
                  <span>ORBITAL LOOKAHEAD</span>
                  <strong>
                    {Math.round(orbitalLookahead.lookaheadMeters)} m
                  </strong>
                </div>
              )}

              {trajectoryPrediction && trajectoryPrediction.risk!=="stable" && (
                <div
                  className={"trajectory-shield-chip "+trajectoryPrediction.risk}
                  aria-live="assertive"
                >
                  <span>TRAJECTORY SHIELD</span>
                  <strong>
                    {trajectoryPrediction.risk==="warning"
                      ? tr("CORRIGE RUMBO","CORRECT COURSE")
                      : tr("VIGILANDO DERIVA","WATCHING DRIFT")}
                  </strong>
                  <small>
                    {Math.round(trajectoryPrediction.horizonSeconds)} s · ~
                    {Math.round(trajectoryPrediction.futureDistanceFromRouteMeters)} m
                  </small>
                </div>
              )}

              <div
                className="photon-corridor-meter"
                aria-label={tr(
                  "Progreso de Photon Corridor",
                  "Photon Corridor progress"
                )}
              >
                <div>
                  <span>PHOTON CORRIDOR</span>
                  <strong>
                    {Math.round((navigationProgress?.progressRatio ?? 0)*100)}%
                  </strong>
                </div>
                <i aria-hidden="true">
                  <b
                    style={{
                      width:
                        Math.round(
                          (navigationProgress?.progressRatio ?? 0)*100
                        )+"%"
                    }}
                  />
                </i>
              </div>
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
                <span>{copy.speed}</span>
                <strong>
                  {gpsSpeedKph!==null ? gpsSpeedKph+" km/h" : "—"}
                </strong>
              </div>
              <div>
                <span>{copy.gps}</span>
                <strong>
                  {gpsAccuracy!==null
                    ? gpsAccuracy<=20
                      ? copy.excellent+" · ±"+Math.round(gpsAccuracy)+" m"
                      : gpsAccuracy<=50
                        ? copy.good+" · ±"+Math.round(gpsAccuracy)+" m"
                        : copy.weak+" · ±"+Math.round(gpsAccuracy)+" m"
                    : copy.searching}
                </strong>
              </div>
              <button
                type="button"
                className={followGps ? "active" : ""}
                onClick={recenterGpsCamera}
              >
                {followGps ? copy.following : copy.recenter}
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
                      localizeManeuver(nextCue.instruction,deviceLocale.language),
                      nextCue.distanceMeters,
                      true
                    );
                  }
                }}
              >
                {(voiceEnabled ? "🔊 " : "🔇 ")+copy.voice}
              </button>
              <button
                type="button"
                className="danger"
                onClick={()=>{
                  stopGpsNavigation();
                  setLocationStatus(tr("GPS detenido. La ruta permanece visible.","GPS stopped. The route remains visible."));
                }}
              >
                {copy.finish}
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
          <small title={tr("Identificador de la versión instalada","Installed build identifier")}>v{buildRevision}</small>
        </div>

        {menuOpen && (
          <aside className="full-map-menu" aria-label="Menú principal NAVIBORI">
            <div className="full-map-menu-head">
              <div>
                <span>{copy.menu}</span>
                <strong>{copy.exploreNavigate}</strong>
                <small title={tr("Versión publicada en Render","Deployed Render version")}>Build {buildRevision}</small>
              </div>
              <button
                type="button"
                onClick={()=>setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>

            <details className="navibori-health-panel">
              <summary>{tr("Estado técnico de navegación","Navigation health")}</summary>
              <div className="navibori-health-summary" role="status">
                {basemapState==="error"
                  ? tr("El mapa no cargó. Comprueba la conexión y vuelve a abrir NAVIBORI.","Map failed to load. Check connectivity and reopen NAVIBORI.")
                  : !gpsDiagnostics.geolocation
                    ? tr("GPS no disponible: comprueba el permiso de ubicación del navegador.","GPS unavailable: check browser location permission.")
                    : gpsActive && gpsAccuracy!==null && gpsAccuracy>100
                      ? tr("Señal GPS imprecisa. Espera una mejor ubicación antes de conducir.","Low GPS accuracy. Wait for a better location before driving.")
                      : routeBusy!==null
                        ? tr("Calculando la ruta…","Calculating route…")
                        : !routeResult
                          ? tr("Selecciona un comercio y solicita una ruta para comenzar.","Select a business and request a route to begin.")
                          : tr("Ruta disponible. Comprueba el mapa y sigue las indicaciones con precaución.","Route available. Check the map and follow guidance cautiously.")}
              </div>
              <dl>
                <div><dt>{tr("Versión","Version")}</dt><dd>{buildRevision}</dd></div>
                <div><dt>{tr("Mapa","Map")}</dt><dd>{basemapState}</dd></div>
                <div><dt>GPS</dt><dd>{gpsActive ? (demoRoute ? "DEMO" : "LIVE") : tr("Inactivo","Inactive")}</dd></div>
                <div><dt>{tr("Precisión","Accuracy")}</dt><dd>{gpsAccuracy===null ? "—" : "±"+Math.round(gpsAccuracy)+" m"}</dd></div>
                <div><dt>{tr("Seguimiento","Follow mode")}</dt><dd>{followGps ? tr("Activado","On") : tr("Pausado","Paused")}</dd></div>
                <div><dt>{tr("Ruta","Route")}</dt><dd>{routeResult ? tr("Calculada","Calculated") : tr("Sin ruta","No route")}</dd></div>
                <div><dt>{tr("Navegación","Navigation")}</dt><dd>{navigationPhase}</dd></div>
                <div><dt>{tr("Comercios","Businesses")}</dt><dd>{source==="live" ? "LIVE" : "DEMO"} · {mappedBusinesses.length}</dd></div>
                <div><dt>{tr("Sitio seguro","Secure origin")}</dt><dd>{gpsDiagnostics.secure===null ? "—" : gpsDiagnostics.secure ? "HTTPS" : tr("No seguro","Insecure")}</dd></div>
                <div><dt>{tr("Geolocalización","Geolocation")}</dt><dd>{gpsDiagnostics.geolocation===null ? "—" : gpsDiagnostics.geolocation ? tr("Disponible","Available") : tr("No disponible","Unavailable")}</dd></div>
                <div><dt>{tr("Permiso GPS","GPS permission")}</dt><dd>{gpsDiagnostics.permission}</dd></div>
                <div><dt>{tr("Servicio de rutas","Routing service")}</dt><dd>{gpsDiagnostics.routing}</dd></div>
              </dl>
              {gpsDiagnostics.detail && <small role="status">{gpsDiagnostics.detail}</small>}
              <button
                type="button"
                className="navibori-diagnostics-copy"
                onClick={async ()=>{
                  setDiagnosticsCopyStatus("idle");
                  const report=[
                    "NAVIBORI diagnostics",
                    "Build: "+buildRevision,
                    "Map: "+basemapState,
                    "GPS: "+(gpsActive ? (demoRoute ? "DEMO" : "LIVE") : "inactive"),
                    "Accuracy: "+(gpsAccuracy===null ? "unknown" : Math.round(gpsAccuracy)+" m"),
                    "GPS permission: "+gpsDiagnostics.permission,
                    "Geolocation available: "+String(gpsDiagnostics.geolocation),
                    "Secure origin: "+String(gpsDiagnostics.secure),
                    "Routing service: "+gpsDiagnostics.routing,
                    "Route: "+(routeResult ? "calculated" : "none"),
                    "Navigation phase: "+navigationPhase,
                    "Follow: "+String(followGps),
                    "Businesses: "+source+" / "+mappedBusinesses.length,
                    "Status: "+routeStatus
                  ].join("\n");
                  try {
                    if(!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
                    await navigator.clipboard.writeText(report);
                    setDiagnosticsCopyStatus("success");
                  } catch {
                    setDiagnosticsCopyStatus("error");
                  }
                }}
              >{diagnosticsCopyStatus==="success" ? tr("Diagnóstico copiado","Diagnostics copied") : tr("Copiar diagnóstico","Copy diagnostics")}</button>
              {diagnosticsCopyStatus==="error" && <small role="alert">{tr("No se pudo copiar. Comprueba los permisos del navegador.","Could not copy. Check browser permissions.")}</small>}
              {diagnosticsCopyStatus==="success" && <small role="status">{tr("Informe copiado sin coordenadas GPS.","Report copied without GPS coordinates.")}</small>}
              <small>{tr("La precisión y el estado se actualizan mientras usas NAVIBORI. DEMO no representa navegación GPS real.","Status and accuracy update while NAVIBORI runs. DEMO is not live GPS navigation.")}</small>
            </details>

            <div className="full-map-menu-search">
              <input
                type="search"
                value={searchTerm}
                onChange={(event)=>setSearchTerm(event.target.value)}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchPlaceholder}
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
                {copy.noResults}
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
  ? copy.testingGps
  : selected && canRoute
    ? copy.testGpsAndRoute
    : copy.testGps}
                </button>
                <button
                  type="button"
                  onClick={()=>{
                    locateMe();
                    setMenuOpen(false);
                  }}
                >
                  {copy.myLocation}
                </button>
                {gpsActive && (
                  <button
                    type="button"
                    onClick={()=>{
                      recenterGpsCamera();
                      setMenuOpen(false);
                    }}
                  >
                    {copy.recenterGps}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="full-map-diagnostic-button"
                onClick={runGpsDiagnostics}
              >
                {copy.diagnoseGps}
              </button>
              <button
                type="button"
                className={
                  "full-map-diagnostic-button astranav-toggle "+
                  (astraCompassState==="active" ? "active" : "")
                }
                onClick={enableAstraCompass}
              >
                {astraCompassState==="active"
                  ? tr("✦ AstraNav activo","✦ AstraNav active")
                  : tr("✦ Activar AstraNav","✦ Enable AstraNav")}
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
                  {deviceLocale.language==="en" ? "Browser GPS" : "GPS navegador"}
                  <strong>
                    {gpsDiagnostics.geolocation===null
                      ? "—"
                      : gpsDiagnostics.geolocation ? "✓" : "×"}
                  </strong>
                </span>
                <span>
                  {deviceLocale.language==="en" ? "Permission" : "Permiso"}
                  <strong>{gpsDiagnostics.permission}</strong>
                </span>
                <span>
                  {deviceLocale.language==="en" ? "Routes" : "Rutas"}
                  <strong>{gpsDiagnostics.routing}</strong>
                </span>
              </div>
              {gpsDiagnostics.detail && (
                <small className="full-map-menu-status">{gpsDiagnostics.detail}</small>
              )}
              {locationStatus && <small className="full-map-menu-status">{locationStatus}</small>}
            </section>

            <section className="full-map-menu-section">
              <span>{copy.categories}</span>
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
                    {copy.category[item.value]}
                  </button>
                ))}
              </div>
            </section>

            <section className="full-map-menu-section">
              <span>{copy.view}</span>
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
                  {deviceLocale.language==="en" ? "Globe" : "Globo"}
                </button>
              </div>
            </section>

            <nav className="full-map-menu-links" aria-label="Opciones NAVIBORI">
              <Link href="/comercios">{copy.commerce}</Link>
              <Link href="/ar">AR</Link>
              <Link href="/twin">Twin</Link>
              <Link href="/studio">Studio</Link>
              <Link href="/nova">NOVA</Link>
              <Link href="/xeno">XENO</Link>
            </nav>

            <section className="full-map-menu-section full-map-refresh-section">
              <span>
                {deviceLocale.language==="en" ? "Live map" : "Mapa en vivo"}
              </span>
              <div className="full-map-refresh-row">
                <div>
                  <strong>
                    {commerceRefreshState==="refreshing"
                      ? deviceLocale.language==="en" ? "Updating…" : "Actualizando…"
                      : commerceRefreshState==="deferred"
                        ? deviceLocale.language==="en" ? "Update queued" : "Actualización pendiente"
                        : commerceRefreshState==="error"
                          ? deviceLocale.language==="en" ? "Last update failed" : "Falló la última actualización"
                          : deviceLocale.language==="en" ? "Auto · 60 s" : "Auto · 60 s"}
                  </strong>
                  <small>
                    {lastCommerceRefreshAt
                      ? (deviceLocale.language==="en" ? "Updated " : "Actualizado ")+
                        new Intl.DateTimeFormat(deviceLocale.locale,{
                          hour:"numeric",
                          minute:"2-digit"
                        }).format(lastCommerceRefreshAt)
                      : deviceLocale.language==="en"
                        ? "Background refresh enabled"
                        : "Actualización en segundo plano activa"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={()=>void refreshCommerce("manual")}
                  disabled={commerceRefreshState==="refreshing"}
                >
                  {deviceLocale.language==="en" ? "Refresh now" : "Actualizar ahora"}
                </button>
              </div>
              <small className="full-map-menu-status">
                {gpsActive
                  ? deviceLocale.language==="en"
                    ? "Map data refresh waits until navigation ends so the active route and destination never jump."
                    : "La actualización espera a que termine la navegación para que la ruta y el destino activos no cambien."
                  : deviceLocale.language==="en"
                    ? "Businesses, locations and promotions refresh every minute while NAVIBORI is visible."
                    : "Comercios, ubicaciones y promociones se actualizan cada minuto mientras NAVIBORI está visible."}
              </small>
            </section>

            <small className="full-map-menu-locale">
              {deviceLocale.language==="en" ? "Language" : "Idioma"} · {deviceLocale.locale} · {
                languageSource==="peripheral"
                  ? deviceLocale.language==="en" ? "Peripheral" : "Periférico"
                  : deviceLocale.language==="en" ? "Device" : "Dispositivo"
              }
            </small>
            <small className="full-map-menu-foot">
              {copy.specialsHint}
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
                <span>{deviceLocale.language==="en" ? "Near me" : "Cerca de mí"}</span>
                <strong>{deviceLocale.language==="en" ? "Nearby businesses" : "Comercios próximos"}</strong>
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
                    <span>
                      {deviceLocale.language==="en" ? "Approx. " : "Aprox. "}
                      {formatDistance(distanceMeters)}
                      {deviceLocale.language==="en" ? " · straight-line" : " · en línea directa"}
                    </span>
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
                          aria-label={(deviceLocale.language==="en" ? "Navigate by " : "Navegar en ")+copy.modeShort[travel.value]+" · "+business.name}
                          title={copy.modeShort[travel.value]}
                        >
                          <span aria-hidden="true">{travel.icon}</span>
                          <small>{copy.modeShort[travel.value]}</small>
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
                  {addressCopied ? copy.copied : copy.copyAddress}
                </button>
              </div>

              {canRoute ? (
                <>
                  <div className="business-route-launch">
                    <div>
                      <span>{copy.howToGetThere}</span>
                      <small>{copy.oneTapStarts}</small>
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
                          aria-label={(deviceLocale.language==="en" ? "Start GPS by " : "Iniciar GPS en ")+copy.modeShort[travel.value]+" · "+selected.name}
                        >
                          <span aria-hidden="true">{travel.icon}</span>
                          <strong>
                            {routeBusy===travel.value
  ? deviceLocale.language==="en" ? "Calculating…" : "Calculando…"
  : copy.modeShort[travel.value]}
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
                      <strong>{localizeManeuver(nextCue.instruction,deviceLocale.language)}</strong>
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
                            ? copy.hide
                            : routeResult.steps.length+" "+(
                                copy.steps
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
                                      ? copy.destination
                                      : copy.continue}
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
                              localizeManeuver(nextCue.instruction,deviceLocale.language),
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
                          setLocationStatus(tr("GPS detenido. La ruta permanece visible.","GPS stopped. The route remains visible."));
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
