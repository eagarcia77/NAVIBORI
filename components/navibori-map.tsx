"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import * as maplibregl from "maplibre-gl";
import {
  mergeNovaSceneFeatures,
  newTileFetchCache,
  validNovaSceneManifest,
  novaSceneTileMatchesManifest,
  visibleNovaSceneTileIds,
  type NovaSceneCollection,
  type NovaSceneManifest
} from "@/lib/spatial/novascene-tile-cache";
import {
  approachTurnPitch,
  novaSceneBuildingPaint,
  novaSceneRoofPaint,
  type NovaSceneAppearance
} from "@/lib/spatial/novascene-appearance";
import {nearTurnZoom,nextRouteCorridor} from "@/lib/spatial/novascene-route-focus";
import {gpsSignalQuality,shouldDrawSvgFallback,stabilizedCameraBearing} from "@/lib/spatial/novascene-gps-stability";
import {acceptGpsPositionTimestamp,hasLiveGpsFix,normalizeGeolocationTimestamp} from "@/lib/spatial/navibori-gps-freshness";
import {navigationSignalCopy,navigationSignalState} from "@/lib/spatial/navibori-navigation-signal";
import {cameraFollowDecision,gpsCameraUpdateMethod} from "@/lib/spatial/gps-camera-follow";
import {evaluateAutomaticReroute,gpsFixAgeSeconds,reliableGpsForRouting} from "@/lib/commerce/automatic-reroute-guard";
import {evaluateGpsStreamFix,type StreamGpsFix} from "@/lib/commerce/gps-stream-integrity";
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
const ROUTE_FOCUS_SOURCE_ID="navibori-next-corridor";
const ROUTE_FOCUS_GLOW_ID="navibori-next-corridor-glow";
const ROUTE_FOCUS_LINE_ID="navibori-next-corridor-line";


// The reliable OSM raster map supplies streets; real OSM building footprints
// are fetched separately from NAVIBORI's bounded, cached buildings API.
// Extrusion is genuine MapLibre 3D geometry, not a pitched raster image.
const NAVIBORI_BUILDINGS_ID="navibori-3d-buildings";
const NAVIBORI_ROOF_ID="novascene-closeup-roof-caps";
const NAVIBORI_BUILDINGS_SOURCE="navibori-building-geojson";
const NAVIBORI_VECTOR_BUILDINGS_SOURCE="navibori-building-vector";
const NAVIBORI_VECTOR_BUILDINGS_LAYER="navibori-vector-building-extrusions";
const RASTER_BASEMAP:maplibregl.StyleSpecification={
  version:8,
  sources:{
    osm:{
      type:"raster",
      tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize:256,
      attribution:"© OpenStreetMap contributors"
    }
  },
  layers:[{id:"osm-raster",type:"raster",source:"osm",minzoom:0,maxzoom:20}]
};
// NovaScene owns the 3D renderer and locally stored footprints.
function create3DBuildings(map:maplibregl.Map){
  if(!map.getSource(NAVIBORI_BUILDINGS_SOURCE)){
    map.addSource(NAVIBORI_BUILDINGS_SOURCE,{
      type:"geojson",data:{type:"FeatureCollection",features:[]}
    });
  }
  if(!map.getLayer(NAVIBORI_BUILDINGS_ID)){
    map.addLayer({
      id:NAVIBORI_BUILDINGS_ID,type:"fill-extrusion",
      source:NAVIBORI_BUILDINGS_SOURCE,minzoom:14.5,
      layout:{visibility:"visible"},
      paint:novaSceneBuildingPaint("natural")
    });
  }
  if(!map.getLayer(NAVIBORI_ROOF_ID)){
    map.addLayer({
      id:NAVIBORI_ROOF_ID,type:"fill-extrusion",
      source:NAVIBORI_BUILDINGS_SOURCE,minzoom:17.2,
      layout:{visibility:"visible"},
      paint:novaSceneRoofPaint("natural")
    });
  }
  return NAVIBORI_BUILDINGS_ID;
}
type RealityMode="2d"|"3d"|"globe"|"time";
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

    // Highlight the immediate portion ahead without replacing the full route.
    if(!map.getSource(ROUTE_FOCUS_SOURCE_ID)){
      map.addSource(ROUTE_FOCUS_SOURCE_ID,{
        type:"geojson",data:{type:"FeatureCollection",features:[]},lineMetrics:true
      });
    }
    if(!map.getLayer(ROUTE_FOCUS_GLOW_ID)){
      map.addLayer({
        id:ROUTE_FOCUS_GLOW_ID,type:"line",source:ROUTE_FOCUS_SOURCE_ID,
        layout:{"line-cap":"round","line-join":"round"},
        paint:{"line-color":"#e3ffff","line-width":23,"line-blur":5,
          "line-opacity":0.43}
      });
    }
    if(!map.getLayer(ROUTE_FOCUS_LINE_ID)){
      map.addLayer({
        id:ROUTE_FOCUS_LINE_ID,type:"line",source:ROUTE_FOCUS_SOURCE_ID,
        layout:{"line-cap":"round","line-join":"round"},
        paint:{"line-color":"#f7fffd","line-width":5.4,"line-opacity":0.91}
      });
    }
    for(const layerId of [
      ROUTE_GLOW_ID,ROUTE_CASING_ID,ROUTE_LINE_ID,ROUTE_ARROW_ID,
      ROUTE_FOCUS_GLOW_ID,ROUTE_FOCUS_LINE_ID
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
  const routeSvgRef=useRef<SVGSVGElement|null>(null);
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
  const stableCameraBearingRef=useRef<number|null>(null);
  const orientationHandlerRef=useRef<((event:DeviceOrientationEvent)=>void)|null>(null);
  const routeAbortRef=useRef<AbortController|null>(null);
  const gpsWatchRef=useRef<number|null>(null);
  const lastContinuousFixRef=useRef<StreamGpsFix|null>(null);
  const unconfirmedGpsJumpRef=useRef<StreamGpsFix|null>(null);
  const gpsSessionRef=useRef(0);
  const latestPositionTimestampRef=useRef<number|null>(null);
  const gpsLastLiveFixAtRef=useRef<number|null>(null);
  const gpsResumeFixRef=useRef<(()=>void)|null>(null);
  const gpsResumeRequestPendingRef=useRef(false);
  const gpsBootstrapTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const routePreviewTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const activeNavigationModeRef=useRef<InMapRouteMode|null>(null);
  const lastRouteOriginRef=useRef<RouteCoordinate|null>(null);
  const lastRouteRefreshAtRef=useRef(0);
  const consecutiveOffRouteFixesRef=useRef(0);
  const lastOffRouteCandidateAtRef=useRef<number|null>(null);
  const routeResultRef=useRef<InMapRouteResult|null>(null);
  const followGpsRef=useRef(true);
  const lastFollowCameraAtRef=useRef(0);
  const gpsActiveRef=useRef(false);
  const voiceEnabledRef=useRef(false);
  const lastSpokenInstructionRef=useRef("");
  const pendingSpeechKeyRef=useRef("");
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
  const [mode,setMode]=useState<RealityMode>("3d");
  const mapModeRef=useRef<RealityMode>("3d");
  const buildingsLayerRef=useRef<string|null>(null);
  const [buildings3DState,setBuildings3DState]=useState<"loading"|"ready"|"no-data"|"unavailable">("loading");
  const [sceneAppearance,setSceneAppearance]=useState<NovaSceneAppearance>("natural");
  const [buildingCount,setBuildingCount]=useState(0);
  const [buildingRenderedCount,setBuildingRenderedCount]=useState(0);
  const [nativeRouteVisible,setNativeRouteVisible]=useState(false);
  const [buildingError,setBuildingError]=useState("");
  const buildingRefreshRef=useRef<((force?:boolean)=>void)|null>(null);
  const streetZoomBeforeGlobeRef=useRef<number|null>(null);
  const [timeOpen,setTimeOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [basemapState,setBasemapState]=useState<"loading"|"ready"|"error">("loading");
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const [category,setCategory]=useState<MapCategory>("all");
  const [userLocation,setUserLocation]=useState<RouteCoordinate|null>(null);
  const [locationStatus,setLocationStatus]=useState("");
  const [routeResult,setRouteResult]=useState<InMapRouteResult|null>(null);
  const [routeStatus,setRouteStatus]=useState("");
  const [routeVisualStatus,setRouteVisualStatus]=useState<"idle"|"visible"|"error">("idle");
  const [routeBusy,setRouteBusy]=useState<InMapRouteMode|null>(null);
  const [lastRouteMode,setLastRouteMode]=useState<InMapRouteMode>("driving");
  const [gpsActive,setGpsActive]=useState(false);
  const [gpsAccuracy,setGpsAccuracy]=useState<number|null>(null);
  const [gpsSpeedKph,setGpsSpeedKph]=useState<number|null>(null);
  const [gpsSignalHeartbeat,setGpsSignalHeartbeat]=useState(0);
  const [gpsStreamFixCount,setGpsStreamFixCount]=useState(0);
  const [gpsUnconfirmedJump,setGpsUnconfirmedJump]=useState(false);
  const [gpsResumePending,setGpsResumePending]=useState(false);
  const [navigationBearingDegrees,setNavigationBearingDegrees]=useState<number|null>(null);
  const [trajectoryPrediction,setTrajectoryPrediction]=useState<TrajectoryPrediction|null>(null);
  const [gravityLensPhase,setGravityLensPhase]=useState<GravityLensPhase>("cruise");
  const [driftBridgeEstimate,setDriftBridgeEstimate]=useState<DriftBridgeEstimate|null>(null);
  const [astraCompassState,setAstraCompassState]=useState<
    "idle"|"active"|"blocked"|"unsupported"
  >("idle");
  const [gpsTestBusy,setGpsTestBusy]=useState(false);
  const [gpsProbeStatus,setGpsProbeStatus]=useState<
    "idle"|"testing"|"received"|"denied"|"unavailable"|"timeout"
  >("idle");
  const [gpsProbeAccuracy,setGpsProbeAccuracy]=useState<number|null>(null);
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
  const [searchOpen,setSearchOpen]=useState(false);
  const [routeModePickerOpen,setRouteModePickerOpen]=useState(false);
  const [previewingLocation,setPreviewingLocation]=useState(false);
  const previewRequestIdRef=useRef(0);
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
  const signal=navigationSignalState(
    demoRoute,gpsLastLiveFixAtRef.current,gpsSignalHeartbeat||Date.now()
  );
  const signalCopy=navigationSignalCopy(
    signal,deviceLocale.language,gpsAccuracy,gpsResumePending
  );
  const gpsAgeSeconds=gpsFixAgeSeconds(gpsLastLiveFixAtRef.current,
    gpsSignalHeartbeat||Date.now());
  const confidentGpsForRerouting=signal.current&&reliableGpsForRouting(gpsAccuracy);
  const navigationSessionVisible=Boolean(
    gpsActive||(navigationPhase!=="idle"&&navigationPhase!=="error"&&selected)
  );

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
        if(map.isMoving())return;
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
      // Persist an explicit language choice across page reloads and installed PWA launches.
      try{
        const saved=window.localStorage.getItem("navibori:preferred-language");
        if(saved==="es-PR" || saved==="en-US"){
          document.documentElement.dataset.peripheralLocale=saved;
        }else if(saved==="auto"){
          delete document.documentElement.dataset.peripheralLocale;
        }
      }catch{
        // Private browsing may disable storage; device language still works.
      }
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
      if(document.visibilityState!=="visible")return;
      if(gpsResumeFixRef.current){
        if(gpsActiveRef.current && "wakeLock" in navigator && !wakeLockRef.current){
          void navigator.wakeLock.request("screen")
            .then((sentinel)=>{
              if(gpsActiveRef.current)wakeLockRef.current=sentinel;
              else void sentinel.release().catch(()=>{});
            }).catch(()=>{});
        }
        // Safari may suspend geolocation while another app is foreground.
        // Ask for one fresh fix when resuming; do not create a second watch.
        gpsResumeFixRef.current?.();
      }
    };
    document.addEventListener("visibilitychange",handleVisibility);
    window.addEventListener("pageshow",handleVisibility);
    return ()=>{
      document.removeEventListener("visibilitychange",handleVisibility);
      window.removeEventListener("pageshow",handleVisibility);
    };
  },[]);

  useEffect(()=>{
    if(!gpsActive&&navigationPhase==="idle"){
      setGpsResumePending(false);
      return;
    }
    const ticker=window.setInterval(()=>{
      if(document.visibilityState==="visible"){
        setGpsSignalHeartbeat(Date.now());
      }
    },4000);
    return ()=>window.clearInterval(ticker);
  },[gpsActive,navigationPhase]);

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

    // Fix the Next.js/Turbopack MapLibre v6 default ESM Worker URL.
    // GeoJSON (and therefore all 3D walls) cannot render without this worker.
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map=new maplibregl.Map({
      container:mapNode.current,
      style:RASTER_BASEMAP,
      center:JUANA_DIAZ_REFERENCE,
      zoom:17,
      pitch:58,
      bearing:-16,
      canvasContextAttributes:{antialias:true}
    });
    // Browser-only acceptance diagnostics, enabled only by the explicit
    // ?novasceneQA=1 test parameter. No GPS locations are exported.
    if(new URLSearchParams(window.location.search).get("novasceneQA")==="1"){
      (window as unknown as {__novaQA?:{
        focus:(lng?:number,lat?:number)=>void; inspect:()=>Record<string,unknown>;
      }}).__novaQA={
        focus:(lng=-66.506,lat=18.052)=>map.jumpTo({center:[lng,lat],zoom:17.5,pitch:58,bearing:-16}),
        inspect:()=>({
          zoom:map.getZoom(),
          longitude:map.getCenter().lng,
          latitude:map.getCenter().lat,
          pitch:map.getPitch(),
          hasLayer:Boolean(map.getLayer(NAVIBORI_BUILDINGS_ID)),
          visibility:map.getLayer(NAVIBORI_BUILDINGS_ID)
            ?map.getLayoutProperty(NAVIBORI_BUILDINGS_ID,"visibility"):null,
          hasSource:Boolean(map.getSource(NAVIBORI_BUILDINGS_SOURCE)),
          styleLoaded:map.isStyleLoaded(),
          rendered:map.getLayer(NAVIBORI_BUILDINGS_ID)
            ?map.queryRenderedFeatures({layers:[NAVIBORI_BUILDINGS_ID]}).length:0,
          renderedRoofs:map.getLayer(NAVIBORI_ROOF_ID)
            ?map.queryRenderedFeatures({layers:[NAVIBORI_ROOF_ID]}).length:0,
          routeAboveBuildings:(()=>{
            const ids=map.getStyle().layers?.map(layer=>layer.id)??[];
            const buildingIndex=ids.indexOf(NAVIBORI_BUILDINGS_ID);
            const roofIndex=ids.indexOf(NAVIBORI_ROOF_ID);
            const routeIndex=ids.indexOf(ROUTE_LINE_ID);
            const focusIndex=ids.indexOf(ROUTE_FOCUS_LINE_ID);
            return buildingIndex>=0 && roofIndex>buildingIndex &&
              routeIndex>roofIndex && focusIndex>routeIndex;
          })(),
          sourceFeatures:map.getSource(NAVIBORI_BUILDINGS_SOURCE)
            ?map.querySourceFeatures(NAVIBORI_BUILDINGS_SOURCE).length:0
        })
      };
    }
    let disposed=false;
    let mapInitialized=false;
    let refreshTimer:ReturnType<typeof setTimeout>|null=null;
    let renderingCheckTimer:ReturnType<typeof setTimeout>|null=null;
    let vectorWatchdog:ReturnType<typeof setTimeout>|null=null;
    let visualMonitorAt=0;
    let lastRouteMonitorAt=0;
    let lastNativeRouteVisible=false;
    let lastReported3DCount=-1;
    let manifest: NovaSceneManifest|null=null;
    let manifestLoading:Promise<NovaSceneManifest|null>|null=null;
    const tileCache=newTileFetchCache(72);
    const inflight=new Map<string,Promise<NovaSceneCollection>>();
    const requests=new Set<AbortController>();
    let generation=0;
    let lastTileSignature="";
    let lastCameraCheck=0;
    let lastCenter:{lng:number;lat:number}|null=null;
    let lastRenderedFeatures=0;

    const countVectorBuildings=()=>{
      if(!map.getLayer(NAVIBORI_BUILDINGS_ID) ||
        map.getLayoutProperty(NAVIBORI_BUILDINGS_ID,"visibility")==="none")return 0;
      try{return map.queryRenderedFeatures({layers:[NAVIBORI_BUILDINGS_ID]}).length;}
      catch{return 0;}
    };

    const loadManifest=async()=>{
      if(manifest)return manifest;
      if(manifestLoading)return manifestLoading;
      manifestLoading=(async()=>{
        const response=await fetch("/data/novascene/tiles/manifest-v2.json",{
          cache:"force-cache"
        });
        if(!response.ok)throw Error("NovaScene tiles manifest HTTP "+response.status);
        const result:unknown=await response.json();
        if(!validNovaSceneManifest(result))throw Error("NovaScene tile manifest invalid");
        manifest=result;
        return manifest;
      })();
      try{return await manifestLoading;}
      finally{manifestLoading=null;}
    };

    const loadTile=async(key:string,currentManifest:NovaSceneManifest)=>{
      const cached=tileCache.get(key);
      if(cached)return cached;
      const old=inflight.get(key);
      if(old)return old;
      const target=currentManifest.tiles[key];
      // Only load the expected same-origin filename for this numeric cell ID.
      if(!target || target.path!=="/data/novascene/tiles/v2/"+key+".geojson"){
        throw Error("NovaScene tile path invalid");
      }
      const controller=new AbortController();
      requests.add(controller);
      const timeout=setTimeout(()=>controller.abort(),9000);
      const work=(async()=>{
        const response=await fetch(target.path,{signal:controller.signal,cache:"force-cache"});
        if(!response.ok)throw Error("Tile "+key+" HTTP "+response.status);
        const data=await response.json() as NovaSceneCollection;
        if(!novaSceneTileMatchesManifest(data,target.count)){
          throw Error("Tile "+key+" has missing or invalid building data");
        }
        tileCache.set(key,data);
        return data;
      })();
      inflight.set(key,work);
      try{return await work;}
      finally{
        clearTimeout(timeout);
        requests.delete(controller);
        inflight.delete(key);
      }
    };

    const update3DBuildings=async(force=false)=>{
      if(disposed||mapModeRef.current!=="3d")return;
      if(!map.getSource(NAVIBORI_BUILDINGS_SOURCE))return;
      const updateId=++generation;
      try{
        const currentManifest=await loadManifest();
        if(!currentManifest||disposed||updateId!==generation)return;
        if(map.getZoom()<14.5){
          setBuildings3DState("no-data");
          setBuildingError(tr("Acerca el mapa para activar edificios.","Zoom in to show buildings."));
          return;
        }
        const bounds=map.getBounds();
        const viewport={
          west:bounds.getWest(),south:bounds.getSouth(),
          east:bounds.getEast(),north:bounds.getNorth()
        };
        // Adjacent cells are prefetched for the next GPS maneuver. The
        // backend never cuts after the first 2,500 features.
        const ids=visibleNovaSceneTileIds(currentManifest,viewport,0.002);
        const signature=ids.join(",");
        if(!force && signature===lastTileSignature)return;
        if(!ids.length){
          const source=map.getSource(NAVIBORI_BUILDINGS_SOURCE) as maplibregl.GeoJSONSource|undefined;
          source?.setData({type:"FeatureCollection",features:[]} as never);
          lastRenderedFeatures=0;
          lastTileSignature="";
          setBuildingCount(0);
          setBuildingRenderedCount(0);
          setBuildings3DState("no-data");
          setBuildingError(tr(
            "No hay contornos cartografiados dentro de la cobertura local.",
            "No mapped footprints available within local coverage."
          ));
          return;
        }
        if(lastRenderedFeatures===0){
          setBuildings3DState("loading");
        }
        setBuildingError("");
        const collections:Array<NovaSceneCollection|undefined>=Array(ids.length);
        const failures:string[]=[];
        // Six concurrent small files limit bandwidth spikes on mobile networks.
        let pointer=0;
        const workers=Array.from({length:Math.min(6,ids.length)},async()=>{
          while(pointer<ids.length && !disposed){
            const index=pointer++;
            try{
              collections[index]=await loadTile(ids[index],currentManifest);
            }catch(error){
              failures.push(error instanceof Error?error.message:"3D tile failed");
            }
          }
        });
        await Promise.all(workers);
        if(disposed||updateId!==generation||mapModeRef.current!=="3d")return;
        const ready=collections.filter((item):item is NovaSceneCollection=>Boolean(item));
        if(ready.length===0)throw Error(failures[0]??"No local 3D tile loaded");
        const merged=mergeNovaSceneFeatures(ready);
        const source=map.getSource(NAVIBORI_BUILDINGS_SOURCE) as maplibregl.GeoJSONSource|undefined;
        if(!source)return;
        source.setData(merged as never);
        lastTileSignature=failures.length?"":signature; // retry missing cells on next map movement
        lastRenderedFeatures=merged.features.length;
        setBuildingCount(merged.features.length);
        setBuildingRenderedCount(0);
        setBuildings3DState(merged.features.length?"loading":"no-data");
        if(failures.length){
          setBuildingError(tr(
            failures.length+" zonas aún no cargadas; reintenta al mover el mapa.",
            failures.length+" cells not loaded; retry on map movement."
          ));
        }
        if(renderingCheckTimer!==null)clearTimeout(renderingCheckTimer);
        if(merged.features.length>0){
          let checks=0;
          const verify=()=>{
            if(disposed||updateId!==generation||mapModeRef.current!=="3d")return;
            const visible=countVectorBuildings();
            if(visible>0){
              setBuildingRenderedCount(visible);
              setBuildings3DState("ready");
            }else if(++checks<9){
              renderingCheckTimer=setTimeout(verify,600);
            }else{
              setBuildings3DState("no-data");
              setBuildingError(tr(
                "Se cargaron contornos, pero no se dibujaron paredes 3D.",
                "Footprints loaded, but no 3D walls were drawn."
              ));
            }
          };
          renderingCheckTimer=setTimeout(verify,450);
        }
        for(const id of [ROUTE_GLOW_ID,ROUTE_CASING_ID,ROUTE_LINE_ID,ROUTE_ARROW_ID]){
          if(map.getLayer(id))map.moveLayer(id);
        }
      }catch(error){
        if(disposed||updateId!==generation)return;
        setBuildings3DState("unavailable");
        setBuildingError(error instanceof Error?error.message.slice(0,160):
          tr("No se pudo cargar la cartografía 3D.","3D map failed to load."));
      }
    };

    const queueBuildingsRefresh=(force=false)=>{
      if(disposed||mapModeRef.current!=="3d")return;
      if(refreshTimer!==null)clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>{
        refreshTimer=null;
        void update3DBuildings(force);
      },force?50:650);
    };
    buildingRefreshRef.current=queueBuildingsRefresh;
    const setupMap=()=>{
      if(disposed||mapInitialized)return;
      mapInitialized=true;
      buildingsLayerRef.current=create3DBuildings(map);
      ensureRouteInfrastructure(map);
      let initialMode:RealityMode="3d";
      try{
        const stored=window.localStorage.getItem("navibori:map-mode-v3");
        if(stored==="2d"||stored==="globe")initialMode=stored;
        const streetZoom=Number(window.localStorage.getItem("navibori:street-zoom"));
        if(Number.isFinite(streetZoom)&&streetZoom>=1&&streetZoom<=22){
          streetZoomBeforeGlobeRef.current=streetZoom;
        }
      }catch{}
      if(initialMode==="globe"){
        map.setProjection({type:"globe"});
        map.setZoom(8);
        map.setPitch(0);
      }else{
        map.setPitch(initialMode==="3d"?58:0);
      }
      mapModeRef.current=initialMode;
      setMode(initialMode);
      map.setLayoutProperty(NAVIBORI_BUILDINGS_ID,"visibility",initialMode==="3d"?"visible":"none");
      if(map.getLayer(NAVIBORI_ROOF_ID)){
        map.setLayoutProperty(NAVIBORI_ROOF_ID,"visibility",initialMode==="3d"?"visible":"none");
      }
      setMapReady(true);
      setBasemapState("ready");
      // Offline-first NovaScene: real building data lives on NAVIBORI itself.
      queueBuildingsRefresh(true);
      // Check whether extrusion faces actually become visible on this device.
      // Tiles report true loading/errors themselves; do not overwrite a
      // pending request with a misleading no-data watchdog state.
    };
    map.on("style.load",setupMap);
    // 'style.load' can fire before the route infrastructure may be added.
    // Repair only when the fully loaded style has missing or hidden layers.
    const repairRouteLayers=()=>{
      if(disposed||!map.isStyleLoaded())return;
      if(!map.getSource(ROUTE_SOURCE_ID)||!map.getLayer(ROUTE_LINE_ID)){
        ensureRouteInfrastructure(map);
      }
      const layerIds=map.getStyle().layers?.map(layer=>layer.id)??[];
      const buildingIndex=layerIds.indexOf(NAVIBORI_BUILDINGS_ID);
      const roofIndex=layerIds.indexOf(NAVIBORI_ROOF_ID);
      const routeIndex=layerIds.indexOf(ROUTE_LINE_ID);
      if(routeIndex>=0&&
        ((buildingIndex>=0&&routeIndex<buildingIndex)||
         (roofIndex>=0&&routeIndex<roofIndex))){
        for(const id of [ROUTE_GLOW_ID,ROUTE_CASING_ID,ROUTE_LINE_ID,
          ROUTE_ARROW_ID,ROUTE_FOCUS_GLOW_ID,ROUTE_FOCUS_LINE_ID]){
          if(map.getLayer(id))map.moveLayer(id);
        }
      }
    };
    map.on("load",()=>{
      setupMap();
      repairRouteLayers();
    });
    map.on("moveend",()=>{
      if(mapModeRef.current!=="3d")return;
      // Refresh when moving between tiles, including during GPS-follow.
      queueBuildingsRefresh();
      if(gpsActiveRef.current)return;
      const desiredPitch=adaptiveStreetPitch(map.getZoom());
      if(Math.abs(map.getPitch()-desiredPitch)>1&&!map.isMoving()){
        map.easeTo({
          pitch:desiredPitch,
          duration:window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:260
        });
      }
    });
    map.on("styledata",repairRouteLayers);
    map.on("error",(event)=>{
      if(!event.error||disposed)return;
      // Building provider errors are handled separately; GPS stays active.
      const detail=String(event.error.message??event.error);
      if(/tile.openstreetmap.org|osm-raster/i.test(detail)){
        setBasemapState("error");
      }
    });
    map.on("sourcedata",(event)=>{
      if(!event.isSourceLoaded || (
        event.sourceId!==NAVIBORI_BUILDINGS_SOURCE &&
        event.sourceId!==NAVIBORI_VECTOR_BUILDINGS_SOURCE
      ))return;
      for(const id of [ROUTE_GLOW_ID,ROUTE_CASING_ID,ROUTE_LINE_ID,
        ROUTE_ARROW_ID,ROUTE_FOCUS_GLOW_ID,ROUTE_FOCUS_LINE_ID]){
        if(map.getLayer(id))map.moveLayer(id);
      }
    });
    // GPS follow never becomes idle on many iPhones. Sample visible faces
    // sparingly during render events, even while the camera is moving.
    map.on("render",()=>{
      if(disposed||mapModeRef.current!=="3d"||Date.now()-visualMonitorAt<1500)return;
      visualMonitorAt=Date.now();
      // Moving GPS camera may never be idle: request new cell coverage
      // after substantial travel, without reloading on every frame.
      const current=map.getCenter();
      if(Date.now()-lastCameraCheck>2200&&map.getZoom()>=14.5&&
        (!lastCenter||Math.abs(current.lng-lastCenter.lng)>0.0018||
         Math.abs(current.lat-lastCenter.lat)>0.0018)){
        lastCameraCheck=Date.now();
        lastCenter={lng:current.lng,lat:current.lat};
        queueBuildingsRefresh();
      }
      const vectorVisible=countVectorBuildings();
      if(vectorVisible>0 && vectorVisible!==lastReported3DCount){
        lastReported3DCount=vectorVisible;
        setBuildingRenderedCount(vectorVisible);
        setBuildings3DState("ready");
        setBuildingError("");
      }
    });
    // Inspect actual WebGL route faces, not just source/layer existence.
    // The SVG is a backup rather than a second permanent road stripe.
    map.on("render",()=>{
      if(disposed||Date.now()-lastRouteMonitorAt<1100)return;
      lastRouteMonitorAt=Date.now();
      let visible=false;
      if(routeResultRef.current&&map.getLayer(ROUTE_LINE_ID)){
        try{
          visible=map.getLayoutProperty(ROUTE_LINE_ID,"visibility")!=="none" &&
            map.queryRenderedFeatures({layers:[ROUTE_LINE_ID]}).length>0;
        }catch{visible=false;}
      }
      if(visible!==lastNativeRouteVisible){
        lastNativeRouteVisible=visible;
        setNativeRouteVisible(visible);
      }
    });
    map.on("idle",()=>{
      repairRouteLayers();
      if(disposed||mapModeRef.current!=="3d"||!map.getLayer(NAVIBORI_BUILDINGS_ID))return;
      try{
        const native=map.getLayer(NAVIBORI_VECTOR_BUILDINGS_LAYER) &&
          map.getLayoutProperty(NAVIBORI_VECTOR_BUILDINGS_LAYER,"visibility")!=="none"
            ? map.queryRenderedFeatures({layers:[NAVIBORI_VECTOR_BUILDINGS_LAYER]})
            : [];
        const features=map.queryRenderedFeatures({layers:[NAVIBORI_BUILDINGS_ID]});
        const visibleCount=features.length||native.length;
        if(visibleCount>0){
          setBuildingRenderedCount(visibleCount);
          setBuildings3DState("ready");
          setBuildingError("");
        }
      }catch(error){
        setBuildingError(error instanceof Error?error.message.slice(0,160):"3D rendering failed");
        setBuildings3DState("unavailable");
      }
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
      disposed=true;
      buildingRefreshRef.current=null;
      if(refreshTimer!==null)clearTimeout(refreshTimer);
      if(vectorWatchdog!==null)clearTimeout(vectorWatchdog);
      if(renderingCheckTimer!==null)clearTimeout(renderingCheckTimer);
      requests.forEach(request=>request.abort());
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
      // During one-tap GPS launch, the follow camera takes priority over
      // selection previews. Never interrupt an active map animation.
      if(!pendingNavigation&&!activeNavigationModeRef.current&&
         !gpsActiveRef.current&&!map.isMoving()){
        map.easeTo({
          center:[focused.mapLocation.longitude,focused.mapLocation.latitude],
          zoom:17,duration:700
        });
      }
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
    pendingNavigation,
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
      const focus=map.getSource(ROUTE_FOCUS_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;
      focus?.setData(empty);
      setRouteVisualStatus("idle");
      return;
    }

    let cancelled=false;
    const retryTimers:number[]=[];

    const renderRoute=()=>{
      if(cancelled) return true;
      const ok=drawRouteOnMap(
        routeResult,
        navigationProgress?.progressRatio ?? 0
      );
      setRouteVisualStatus(ok ? "visible" : "error");
      return ok;
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

    // Progress updates re-render the route while the GPS session is active.
    // Never re-fit bounds for every progress tick: that starts overlapping
    // MapLibre ease frames and can crash Chromium's _onEaseFrame callback.
    // Preview/follow actions own the camera separately.
    if(gpsActive || gpsActiveRef.current || pendingNavigation ||
      activeNavigationModeRef.current){
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
    pendingNavigation,
    routeResult,
    userLocation
  ]);

  // Respect a saved style without changing map data, GPS routing or heights
  // reported by Overture. The default style depicts low-rise housing.
  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem("navibori:novascene-appearance");
      if(saved==="natural"||saved==="digital")setSceneAppearance(saved);
    }catch{}
  },[]);
  useEffect(()=>{
    const map=mapRef.current;
    const layer=buildingsLayerRef.current;
    if(map&&layer&&map.getLayer(layer)){
      const paint=novaSceneBuildingPaint(sceneAppearance);
      map.setPaintProperty(layer,"fill-extrusion-color",paint["fill-extrusion-color"]);
      map.setPaintProperty(layer,"fill-extrusion-height",paint["fill-extrusion-height"]);
      map.setPaintProperty(layer,"fill-extrusion-opacity",
        gpsActive ? (sceneAppearance==="natural"?0.73:0.77)
          : (sceneAppearance==="natural"?0.92:0.94));
    }
    if(map?.getLayer(NAVIBORI_ROOF_ID)){
      const roofPaint=novaSceneRoofPaint(sceneAppearance);
      map.setPaintProperty(NAVIBORI_ROOF_ID,"fill-extrusion-color",
        roofPaint["fill-extrusion-color"]);
      map.setPaintProperty(NAVIBORI_ROOF_ID,"fill-extrusion-height",
        roofPaint["fill-extrusion-height"]);
      map.setPaintProperty(NAVIBORI_ROOF_ID,"fill-extrusion-base",
        roofPaint["fill-extrusion-base"]);
      map.setPaintProperty(NAVIBORI_ROOF_ID,"fill-extrusion-opacity",
        gpsActive?0.76:(sceneAppearance==="natural"?0.93:0.91));
    }
    try{window.localStorage.setItem("navibori:novascene-appearance",sceneAppearance);}catch{}
  },[sceneAppearance,gpsActive,mapReady]);

  function adaptiveStreetPitch(zoom:number){
    // Smooth interpolation avoids abrupt camera jumps across zoom thresholds.
    if(zoom<=14) return 38;
    if(zoom>=18) return 58;
    return 38+(zoom-14)*5;
  }

  function activateMapMode(next:RealityMode){
    const map=mapRef.current;
    if(!map) return;

    // During live navigation, offer immersive 3D street perspective instead of
    // switching to the low-zoom globe overview and obscuring route detail.
    if(gpsActive && next==="globe"){
      next="3d";
    }
    // Navigation must not open the time-exploration view over an active route.
    if(gpsActive && next==="time"){
      next=mapModeRef.current==="3d" ? "3d" : "2d";
      setTimeOpen(false);
    }

    // Honor accessibility settings when transitioning between map perspectives.
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(next==="globe"){
      if(mapModeRef.current!=="globe"){
        streetZoomBeforeGlobeRef.current=map.getZoom();
        try{
          window.localStorage.setItem("navibori:street-zoom",String(map.getZoom()));
        }catch{
          // Map navigation still works when browser storage is unavailable.
        }
      }
      // The globe is an overview, not a street-level turn-by-turn camera.
      map.setProjection({type:"globe"});
      map.easeTo({
        zoom:Math.min(map.getZoom(),8),
        pitch:0,
        bearing:0,
        duration:reducedMotion ? 0 : 900
      });
    }else{
      map.setProjection({type:"mercator"});
      map.easeTo({
        // Returning from globe should restore street detail in both 2D and 3D.
        zoom:mapModeRef.current==="globe" ? (streetZoomBeforeGlobeRef.current ?? Math.max(map.getZoom(),15)) : map.getZoom(),
        pitch:next==="3d"
          ? adaptiveStreetPitch(mapModeRef.current==="globe"
              ? (streetZoomBeforeGlobeRef.current ?? Math.max(map.getZoom(),15))
              : map.getZoom())
          : 0,
        bearing:next==="3d" ? map.getBearing() : 0,
        duration:reducedMotion ? 0 : 750
      });
    }

    if(buildingsLayerRef.current&&map.getLayer(buildingsLayerRef.current)){
      map.setLayoutProperty(buildingsLayerRef.current,"visibility",next==="3d"?"visible":"none");
    }
    if(map.getLayer(NAVIBORI_ROOF_ID)){
      map.setLayoutProperty(NAVIBORI_ROOF_ID,"visibility",next==="3d"?"visible":"none");
    }
    if(map.getLayer(NAVIBORI_VECTOR_BUILDINGS_LAYER)){
      // Keep vector hidden if GeoJSON roofs have already been rendered.
      const geojsonRendered=map.getLayer(NAVIBORI_BUILDINGS_ID) &&
        map.queryRenderedFeatures({layers:[NAVIBORI_BUILDINGS_ID]}).length>0;
      map.setLayoutProperty(NAVIBORI_VECTOR_BUILDINGS_LAYER,"visibility",
        next==="3d"&&!geojsonRendered?"visible":"none");
    }
    mapModeRef.current=next;
    setMode(next);
    if(next==="3d"){
      // Native OSMF tiles are preferred. Retry the auxiliary API only when
      // the map lacks visible building polygons.
      // Switching perspective always rechecks the local cell index.
      buildingRefreshRef.current?.(true);
    }
    try{
      if(next==="2d" || next==="3d" || next==="globe"){
        window.localStorage.setItem("navibori:map-mode-v3",next);
      }
    }catch{
      // Map switching must remain available without persistent storage.
    }
    setTimeOpen(next==="time");
  }

  function focusBusiness(business:CommerceProfile){
    const location=business.mapLocation;
    if(!location) return;

    stopGpsNavigation();
    routeAbortRef.current?.abort();
    routeResultRef.current=null;
    stableCameraBearingRef.current=null;
    setRouteResult(null);
    setRouteStatus("");
    setArrived(false);
    setDirectionsOpen(false);
    setPendingNavigation(null);
    pendingSpeechKeyRef.current="";
    lastSpokenInstructionRef.current="";
    const alreadySelected=selectedSlug===business.slug;
    setSelectedSlug(business.slug);
    setSearchOpen(false);
    setSearchTerm("");
    setRouteModePickerOpen(false);
    previewRequestIdRef.current+=1;
    setPreviewingLocation(false);
    // The selection effect normally owns focus animations. Triggering
    // a second ease here interrupts the first MapLibre render frame.
    if(alreadySelected && mapRef.current&&!mapRef.current.isMoving()){
      mapRef.current.easeTo({
        center:[location.longitude,location.latitude],
        zoom:17,
        pitch:mode==="3d"?58:0,
        duration:650
      });
    }
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

      // Build a true arc-length-clipped section of the route ahead of GPS.
      // It never changes route geometry, selected destination or directions.
      const spotlightSource=map.getSource(ROUTE_FOCUS_SOURCE_ID) as maplibregl.GeoJSONSource|undefined;
      const corridor=gpsActiveRef.current
        ? nextRouteCorridor(route.geometry.coordinates,progressRatio,145)
        : [];
      spotlightSource?.setData({
        type:"FeatureCollection",
        features:corridor.length>=2?[{
          type:"Feature",properties:{},
          geometry:{type:"LineString",coordinates:corridor}
        }]:[]
      });

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
      // A single solid, high-contrast route is easier to follow than a
      // progress gradient on detailed streets and satellite-style basemaps.
      // A plain line-color is more compatible than line-gradient across map styles.
      map.setPaintProperty(ROUTE_LINE_ID,"line-color",color);
      map.setPaintProperty(ROUTE_LINE_ID,"line-opacity",1);
      map.setPaintProperty(ROUTE_LINE_ID,"line-width",13);
      map.setPaintProperty(ROUTE_CASING_ID,"line-width",19);

      for(const layerId of [
        ROUTE_GLOW_ID,
        ROUTE_CASING_ID,
        ROUTE_LINE_ID,
        ROUTE_ARROW_ID,
        ROUTE_FOCUS_GLOW_ID,
        ROUTE_FOCUS_LINE_ID
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

  // Independent SVG route overlay: survives WebGL style/layer failures on iOS.
  useEffect(()=>{
    const map=mapRef.current;
    const svg=routeSvgRef.current;
    if(!map || !svg || !routeResult) return;
    const geometry=routeResult.geometry.coordinates;
    if(geometry.length<2) return;
    let frame=0;
    const paint=()=>{
      frame=0;
      const canvas=map.getCanvas();
      const width=canvas.clientWidth;
      const height=canvas.clientHeight;
      if(!width || !height) return;
      svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
      // Keep all road bends: thinning by index can cut across short streets.
      const points=geometry.map(([longitude,latitude])=>{
        if(!Number.isFinite(longitude) || !Number.isFinite(latitude)) return "";
        const point=map.project([longitude,latitude]);
        return Number.isFinite(point.x) && Number.isFinite(point.y)
          ? `${point.x.toFixed(1)},${point.y.toFixed(1)}`
          : "";
      }).filter(Boolean).join(" ");
      svg.querySelectorAll("polyline").forEach(line=>line.setAttribute("points",points));
    };
    const schedule=()=>{if(!frame) frame=window.requestAnimationFrame(paint);};
    paint();
    map.on("move",schedule);
    map.on("render",schedule);
    map.on("resize",schedule);
    map.on("styledata",schedule);
    return ()=>{
      map.off("move",schedule);
      map.off("render",schedule);
      map.off("resize",schedule);
      map.off("styledata",schedule);
      if(frame) window.cancelAnimationFrame(frame);
    };
  },[mapReady,routeResult]);

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
    lastFollowCameraAtRef.current=Date.now();

    const activeMode=activeNavigationModeRef.current;
    // GPS guidance requires a street-level projection, not the globe overview.
    if(mapModeRef.current==="globe"){
      mapRef.current?.setProjection({type:"mercator"});
      mapModeRef.current="2d";
      setMode("2d");
      try{
        window.localStorage.setItem("navibori:map-mode","2d");
      }catch{
        // GPS guidance works without persistent preferences.
      }
    }
    const target=orbitalLookahead?.coordinate ?? userLocation;
    const map=mapRef.current;
    if(map){
      const zoom=Math.max(map.getZoom(),16.8);
      const cameraOptions:maplibregl.JumpToOptions={
        center:[target.longitude,target.latitude],
        zoom,
        pitch:mapModeRef.current==="3d"
          ? adaptiveStreetPitch(zoom)
          : mapModeRef.current==="2d"
            ? 0
            : activeMode==="driving"
              ? 42
              : activeMode==="walking"
                ? 15
                : 28
      };
      // Never interrupt another MapLibre animation. A stale ease frame
      // can crash Chromium while live GPS still receives valid fixes.
      const recenterWhenIdle=()=>{
        if(mapRef.current!==map||!followGpsRef.current||map.isMoving())return;
        const latest=lastContinuousFixRef.current?.coordinate ?? target;
        map.jumpTo({...cameraOptions,center:[latest.longitude,latest.latitude]});
      };
      if(map.isMoving()){
        map.once("moveend",()=>window.requestAnimationFrame(recenterWhenIdle));
      }else{
        recenterWhenIdle();
      }
    }

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
    // Geolocation must be requested synchronously from this user gesture.
    // In particular, iOS embedded browsers may deny a request started
    // indirectly from a useEffect or a page-load route parameter.
    if(!window.isSecureContext){
      setGpsProbeStatus("unavailable");
      setLocationStatus(tr(
        "La ubicación requiere HTTPS. Abre NAVIBORI directamente en Safari.",
        "Location requires HTTPS. Open NAVIBORI directly in Safari."
      ));
      return;
    }
    if(!navigator.geolocation){
      setGpsProbeStatus("unavailable");
      setLocationStatus(tr(
        "Este navegador no permite obtener tu ubicación. Abre el enlace en Safari.",
        "This browser cannot get your location. Open the link in Safari."
      ));
      return;
    }
    if(gpsTestBusy)return;
    setGpsProbeStatus("testing");
    setGpsProbeAccuracy(null);
    setGpsTestBusy(true);
    setLocationStatus(tr(
      "Solicitando una ubicación nueva al dispositivo…",
      "Requesting a fresh device location…"
    ));

    const success=(position:GeolocationPosition)=>{
      const coordinate={
        latitude:position.coords.latitude,
        longitude:position.coords.longitude
      };
      if(!validRouteCoordinate(coordinate) ||
        !acceptGpsPositionTimestamp(position.timestamp,null,Date.now())){
        setGpsTestBusy(false);
        setGpsProbeStatus("unavailable");
        setLocationStatus(tr(
          "La ubicación recibida era inválida o demasiado antigua. Vuelve a intentar.",
          "The location was invalid or too old. Please retry."
        ));
        return;
      }
      const accuracy=Number.isFinite(position.coords.accuracy)
        ? Math.max(0,position.coords.accuracy) : null;
      setGpsProbeStatus("received");
      setGpsProbeAccuracy(accuracy);
      setGpsTestBusy(false);
      setUserLocation(coordinate);
      setGpsAccuracy(accuracy);
      showUserLocation(coordinate);
      mapRef.current?.easeTo({
        center:[coordinate.longitude,coordinate.latitude],
        zoom:16.5,
        duration:window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:480
      });
      setLocationStatus(tr(
        "Ubicación actual recibida del dispositivo. Para seguir una ruta, selecciona Iniciar navegación.",
        "Current device location received. To follow a route, select Start navigation."
      )+(accuracy!==null?" ±"+Math.round(accuracy)+" m.":""));
      // A one-shot fix verifies location capability, not continuous GPS.
      // NEVER automatically start navigation to an unverified DEMO destination.
    };
    const error=(failure:GeolocationPositionError)=>{
      setGpsTestBusy(false);
      setGpsProbeStatus(failure.code===failure.PERMISSION_DENIED?"denied"
        :failure.code===failure.TIMEOUT?"timeout":"unavailable");
      setLocationStatus(geolocationErrorMessage(failure));
    };

    navigator.geolocation.getCurrentPosition(success,error,{
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:15000
    });
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
    const localizedInstruction=localizeManeuver(instruction,deviceLocale.language);
    const key=deviceLocale.language+"|"+localizedInstruction+"|"+distanceBand;
    if(!force && (
      lastSpokenInstructionRef.current===key ||
      pendingSpeechKeyRef.current===key
    )) return;

    pendingSpeechKeyRef.current=key;
    window.speechSynthesis.cancel();

    const prefix=
      distanceMeters>=30
        ? formatManeuverDistance(distanceMeters,deviceLocale.language)+". "
        : "";

    const utterance=new SpeechSynthesisUtterance(prefix+localizedInstruction);
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
    // Only mark a cue as delivered once speech actually starts.
    // Safari can reject or interrupt a queued utterance.
    utterance.onstart=()=>{
      if(pendingSpeechKeyRef.current===key){
        pendingSpeechKeyRef.current="";
      }
      lastSpokenInstructionRef.current=key;
    };
    utterance.onerror=()=>{
      if(pendingSpeechKeyRef.current===key){
        pendingSpeechKeyRef.current="";
      }
      if(lastSpokenInstructionRef.current===key){
        lastSpokenInstructionRef.current="";
      }
    };
    try{
      window.speechSynthesis.speak(utterance);
    }catch{
      if(pendingSpeechKeyRef.current===key){
        pendingSpeechKeyRef.current="";
      }
      if(lastSpokenInstructionRef.current===key){
        lastSpokenInstructionRef.current="";
      }
    }
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

    // Show recalculation progress even when the existing route remains visible.
    setRouteBusy(routeMode);
    if(!quiet){
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
        setRouteBusy(null);
      }
    }
  }

  async function previewSelectedRoute(routeMode:InMapRouteMode){
    if(!selected?.mapLocation||!canRoute||previewingLocation||routeBusy!==null)return;
    const requestId=++previewRequestIdRef.current;
    if(!window.isSecureContext||!navigator.geolocation){
      setRouteStatus(tr(
        "Se necesita HTTPS y acceso a ubicación para calcular la ruta.",
        "HTTPS and location access are required to calculate the route."
      ));
      return;
    }
    setPreviewingLocation(true);
    setRouteStatus(tr("Buscando tu ubicación…","Finding your location…"));
    try{
      const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
        navigator.geolocation.getCurrentPosition(resolve,reject,{
          enableHighAccuracy:true,maximumAge:0,timeout:15000
        });
      });
      if(requestId!==previewRequestIdRef.current)return;
      const origin={
        latitude:position.coords.latitude,
        longitude:position.coords.longitude
      };
      if(!validRouteCoordinate(origin)||
        !acceptGpsPositionTimestamp(position.timestamp,null,Date.now())){
        throw new Error(tr("La ubicación es inválida o demasiado antigua.",
          "The location is invalid or too old."));
      }
      setUserLocation(origin);
      setGpsAccuracy(Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy : null);
      showUserLocation(origin);
      const route=await calculateRoute(routeMode,origin);
      if(requestId!==previewRequestIdRef.current)return;
      if(route){
        setRouteModePickerOpen(false);
        setNavigationPhase("idle");
      }
    }catch(error){
      if(requestId!==previewRequestIdRef.current)return;
      const locationError=error as GeolocationPositionError;
      setNavigationPhase("error");
      setRouteStatus(
        typeof locationError.code==="number"
          ? geolocationErrorMessage(locationError)
          : error instanceof Error ? error.message
            : tr("No pudimos calcular la ruta.","Could not calculate the route.")
      );
    }finally{
      if(requestId===previewRequestIdRef.current){
        setPreviewingLocation(false);
      }
    }
  }

  function stopGpsNavigation(options:{preservePhase?:boolean}={}){
    gpsSessionRef.current+=1;
    gpsResumeFixRef.current=null;
    gpsResumeRequestPendingRef.current=false;
    gpsLastLiveFixAtRef.current=null;
    lastContinuousFixRef.current=null;
    unconfirmedGpsJumpRef.current=null;
    setGpsStreamFixCount(0);
    setGpsUnconfirmedJump(false);
    latestPositionTimestampRef.current=null;
    setGpsResumePending(false);
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
    // A finished navigation must not leave spoken directions queued in Safari.
    pendingSpeechKeyRef.current="";
    lastSpokenInstructionRef.current="";
    if(typeof window!=="undefined" && "speechSynthesis" in window){
      window.speechSynthesis.cancel();
    }
    activeNavigationModeRef.current=null;
    lastRouteOriginRef.current=null;
    lastRouteRefreshAtRef.current=0;
    consecutiveOffRouteFixesRef.current=0;
    lastOffRouteCandidateAtRef.current=null;
    lastFollowCameraAtRef.current=0;
    gpsActiveRef.current=false;
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
    // A one-shot location test is not a continuous GPS tracking session.
    setGpsProbeStatus("idle");
    const sessionId=gpsSessionRef.current;
    const sessionStartedAt=Date.now();
    // A globe overview must not be used for street-level GPS guidance.
    if(mapModeRef.current==="globe"){
      mapRef.current?.setProjection({type:"mercator"});
      mapModeRef.current="2d";
      setMode("2d");
      try{
        window.localStorage.setItem("navibori:map-mode","2d");
      }catch{
        // Navigation does not depend on browser storage.
      }
    }
    // Enter a distraction-reduced, full-map navigation view immediately.
    setMenuOpen(false);
    setTimeOpen(false);
    setDirectionsOpen(false);
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
    let receivedLiveFix=false;
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

      // A first accepted GPS fix or business selection may already have
      // started a camera transition. An automatic full-route fit at that
      // moment would interrupt MapLibre's queued ease frame. Skip the
      // overview if the map is moving; the follow camera will still resume.
      if(!mapRef.current?.isMoving())showFullRoute();
      setRouteStatus(
        routeModeLabel(routeMode,deviceLocale.locale)+
        " · "+copy.routeReady+" · "+formatDistance(route.distanceMeters)+
        " · "+formatDuration(route.durationSeconds)
      );

      routePreviewTimerRef.current=setTimeout(()=>{
        routePreviewTimerRef.current=null;
        // A cached route preview must not masquerade as live GPS follow.
        if(gpsLastLiveFixAtRef.current!==null){
          followGpsRef.current=true;
          setFollowGps(true);
          recenterGpsCamera();
        }else{
          setLocationStatus(tr(
            "Ruta de vista previa · esperando ubicación GPS actual.",
            "Preview route · waiting for a current device GPS position."
          ));
        }
      },1800);
    };

    if(cachedOrigin){
      // A known last position can preview the route; it is NOT a live fix.
      setRouteBusy(null);
      showUserLocation(cachedOrigin);
      void previewThenFollow(cachedOrigin);
    }

    const handlePosition=(position:GeolocationPosition)=>{
      if(gpsSessionRef.current!==sessionId)return;
      const now=Date.now();
      if(!acceptGpsPositionTimestamp(
        position.timestamp,latestPositionTimestampRef.current,now
      )){
        setGpsSignalHeartbeat(now);
        return;
      }
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

      // Reject a transient, very imprecise fix only while a recent, more
      // reliable route fix exists. Never block the initial GPS acquisition.
      const incomingAccuracy=position.coords.accuracy;
      const previousFix=lastGpsFixRef.current;
      if(
        previousFix &&
        Date.now()-previousFix.at<15000 &&
        Number.isFinite(incomingAccuracy) &&
        incomingAccuracy>150 &&
        previousFix.accuracyMeters!==null &&
        previousFix.accuracyMeters<75
      ){
        setGpsAccuracy(incomingAccuracy);
        setLocationStatus(tr(
          "Señal GPS imprecisa: manteniendo la última posición confiable.",
          "Low GPS accuracy: keeping the last reliable position."
        ));
        return;
      }

      const fixTimestamp=normalizeGeolocationTimestamp(position.timestamp);
      if(fixTimestamp===null)return;
      const streamDecision=evaluateGpsStreamFix(
        lastContinuousFixRef.current,{
          coordinate:next,
          timestamp:fixTimestamp,
          accuracyMeters:Number.isFinite(incomingAccuracy)?incomingAccuracy:null
        },unconfirmedGpsJumpRef.current
      );
      if(!streamDecision.accepted){
        unconfirmedGpsJumpRef.current=streamDecision.pendingJump;
        setGpsUnconfirmedJump(streamDecision.reason==="unverified-jump");
        setGpsSignalHeartbeat(now);
        return;
      }
      lastContinuousFixRef.current={
        coordinate:next,timestamp:fixTimestamp,
        accuracyMeters:Number.isFinite(incomingAccuracy)?incomingAccuracy:null
      };
      unconfirmedGpsJumpRef.current=null;
      setGpsUnconfirmedJump(false);
      setGpsStreamFixCount(count=>count+1);
      receivedFix=true;
      receivedLiveFix=true;
      latestPositionTimestampRef.current=fixTimestamp;
      gpsLastLiveFixAtRef.current=now;
      setGpsSignalHeartbeat(now);
      setGpsResumePending(false);
      gpsResumeRequestPendingRef.current=false;
      if(gpsBootstrapTimerRef.current!==null){
        clearTimeout(gpsBootstrapTimerRef.current);
        gpsBootstrapTimerRef.current=null;
      }

      const accuracy=Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : null;

      if(cachedOrigin && !gpsActiveRef.current){
        followGpsRef.current=true;
        setFollowGps(true);
      }
      // Update the synchronous ref before MapLibre events can fire: its
      // moveend handler must not start competing tilt animations while GPS
      // follow-camera movement is being processed.
      gpsActiveRef.current=true;
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
      // Stabilize only the visual camera, never the GPS fix or route.
      const cameraBearing=stabilizedCameraBearing(
        stableCameraBearingRef.current,navigationBearing,speedKphNow,accuracy
      );
      stableCameraBearingRef.current=cameraBearing;
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
        // Dense position updates must not permanently starve the camera
        // while its own animation is running. Manual gestures turn off follow.
        const decision=map?cameraFollowDecision({
          follow:followGpsRef.current,
          visible:document.visibilityState==="visible",
          now:Date.now(),lastCameraAt:lastFollowCameraAtRef.current,
          cameraMoving:map.isMoving(),
          reducedMotion:window.matchMedia("(prefers-reduced-motion: reduce)").matches
        }):"skip";
        if(map&&gpsCameraUpdateMethod(decision)==="jump"){
          lastFollowCameraAtRef.current=Date.now();
          const cameraOptions:maplibregl.JumpToOptions={
            center:[cameraCenter.longitude,cameraCenter.latitude],
            zoom:mapModeRef.current==="3d"
              ? nearTurnZoom(cameraProfile.zoom,cameraCue?.distanceMeters ?? null)
              : cameraProfile.zoom,
            bearing:cameraBearing ?? map.getBearing(),
            pitch:mapModeRef.current==="3d"
              ? approachTurnPitch(adaptiveStreetPitch(cameraProfile.zoom),
                  cameraCue?.distanceMeters ?? null)
              : mapModeRef.current==="2d" ? 0 : cameraProfile.pitch
          };
          map.jumpTo(cameraOptions);
        }
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

        const offRoute=currentRoute!==null &&
          isOffNavigationRoute(next,currentRoute,accuracy);
        const decision=evaluateAutomaticReroute({
          offRoute,accuracyMeters:accuracy,
          lastConfirmedOffRouteAt:lastOffRouteCandidateAtRef.current,
          consecutiveCount:consecutiveOffRouteFixesRef.current,
          lastRouteRefreshAt:lastRouteRefreshAtRef.current,
          now,routeRequestPending:routeAbortRef.current!==null
        });
        consecutiveOffRouteFixesRef.current=decision.consecutiveCount;
        lastOffRouteCandidateAtRef.current=decision.lastConfirmedOffRouteAt;
        if(decision.shouldReroute){
          setRouteStatus(tr("Desvío confirmado · recalculando la ruta…",
            "Confirmed deviation · recalculating route…"));
          void calculateRoute(activeMode,next,{quiet:true});
        }else if(!offRoute && reliableGpsForRouting(accuracy) &&
          routeAbortRef.current===null &&
          shouldRefreshNavigationRoute(
            lastRouteOriginRef.current,next,lastRouteRefreshAtRef.current,now
          )){
          void calculateRoute(activeMode,next,{quiet:currentRoute!==null});
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
      if(gpsSessionRef.current!==sessionId)return;
      if(error.code===error.PERMISSION_DENIED){
        setRouteBusy(null);
        setNavigationPhase("error");
        setLocationStatus(geolocationErrorMessage(error));
        stopGpsNavigation({preservePhase:true});
        return;
      }
      if(receivedLiveFix){
        setGpsResumePending(false);
        setLocationStatus(tr(
          "La señal GPS se interrumpió. Manteniendo la última ubicación hasta recibir una nueva lectura.",
          "GPS signal interrupted. Holding the last location until a new fix arrives."
        ));
        setGpsSignalHeartbeat(Date.now());
        return;
      }
      if(receivedFix)return;

      if(error.code===error.PERMISSION_DENIED){
        setRouteBusy(null);
        setNavigationPhase("error");
        setLocationStatus(geolocationErrorMessage(error));
        stopGpsNavigation({preservePhase:true});
        return;
      }

      requestLowAccuracyFallback();
    };

    gpsResumeFixRef.current=()=>{
      if(gpsSessionRef.current!==sessionId ||
        document.visibilityState!=="visible" ||
        !navigator.geolocation || gpsResumeRequestPendingRef.current)return;
      gpsResumeRequestPendingRef.current=true;
      setGpsResumePending(true);
      setGpsSignalHeartbeat(Date.now());
      navigator.geolocation.getCurrentPosition(
        (position)=>{
          if(gpsSessionRef.current!==sessionId)return;
          gpsResumeRequestPendingRef.current=false;
          setGpsResumePending(false);
          handlePosition(position);
        },
        (error)=>{
          if(gpsSessionRef.current!==sessionId)return;
          gpsResumeRequestPendingRef.current=false;
          setGpsResumePending(false);
          setGpsSignalHeartbeat(Date.now());
          if(error.code===error.PERMISSION_DENIED){
            setLocationStatus(geolocationErrorMessage(error));
          }
        },
        {enableHighAccuracy:true,timeout:12000,maximumAge:0}
      );
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
      if(gpsSessionRef.current!==sessionId)return;
      if(receivedLiveFix || hasLiveGpsFix(gpsLastLiveFixAtRef.current,sessionStartedAt))return;
      if(receivedFix){
        setGpsSignalHeartbeat(Date.now());
        setGpsResumePending(false);
        setLocationStatus(tr(
          "La ruta está preparada, pero aún no hay una posición GPS actual confirmada.",
          "Route prepared, but a current live GPS position is not yet confirmed."
        ));
        return;
      }
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
    previewRequestIdRef.current+=1;
    setPreviewingLocation(false);
    setRouteModePickerOpen(false);
    consecutiveOffRouteFixesRef.current=0;
    lastOffRouteCandidateAtRef.current=null;
    routeAbortRef.current?.abort();
    routeAbortRef.current=null;
    stopGpsNavigation();
    routeResultRef.current=null;
    stableCameraBearingRef.current=null;
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
      data-native-route-visible={nativeRouteVisible ? "true" : "false"}
      data-gps-signal={gpsSignalQuality(gpsAccuracy)}
      data-gps-freshness={signal.fix}
      data-gps-stream-fixes={gpsStreamFixCount}
      data-gps-unconfirmed-jump={gpsUnconfirmedJump?"true":"false"}
      data-gps-probe={gpsProbeStatus}
      data-route-kind={signal.routeKind}
      data-cockpit-phase={lagrangePhase}
      data-exodock-state={exoDockState}
      data-gravity-lens={gravityLensPhase}
      data-navigation-active={gpsActive ? "true" : "false"}
      data-novascene-state={buildings3DState}
      data-novascene-visible={buildingRenderedCount}
      data-novascene-total={buildingCount}
      aria-label={tr("Mapa de comercios NAVIBORI","NAVIBORI business map")}
    >
      <div className="map-stage full-map-stage">
        <div ref={mapNode} className="map-canvas full-map-canvas" />
        {routeResult && (
          <svg ref={routeSvgRef} className="navibori-route-svg-fallback"
            style={shouldDrawSvgFallback(nativeRouteVisible)?undefined:{display:"none"}}
            aria-hidden="true" preserveAspectRatio="none">
            <polyline fill="none" stroke="#ffffff" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
            <polyline fill="none" stroke={routeLineColor(routeResult.mode)} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}

        {gpsProbeStatus!=="idle"&&!gpsActive&&(
          <div className={"navibori-gps-probe navibori-gps-probe-"+gpsProbeStatus}
            role="status" aria-live="polite">
            <strong>{gpsProbeStatus==="testing"
              ?tr("Localizando el dispositivo…","Locating device…")
              :gpsProbeStatus==="received"
                ?tr("Ubicación recibida","Location received")
                :gpsProbeStatus==="denied"
                  ?tr("Permiso de ubicación denegado","Location permission denied")
                  :gpsProbeStatus==="timeout"
                    ?tr("Tiempo de espera agotado","Location request timed out")
                    :tr("Ubicación no disponible","Location unavailable")}</strong>
            <small>{gpsProbeStatus==="received"
              ?tr("Lectura individual, no seguimiento continuo","One-time fix, not continuous tracking")+
                (gpsProbeAccuracy!==null?" · ±"+Math.round(gpsProbeAccuracy)+" m":"")
              :gpsProbeStatus==="testing"
                ?tr("Permite ubicación precisa cuando se solicite.","Allow precise location when prompted.")
                :tr("En iPhone, abre NAVIBORI directamente en Safari y permite ubicación precisa.",
                    "On iPhone, open NAVIBORI directly in Safari and allow precise location.")}</small>
            {gpsProbeStatus==="received"&&selected&&canRoute&&(
              <button type="button"
                onClick={()=>startGpsNavigation(lastRouteMode)}>
                {tr("Iniciar navegación GPS","Start GPS navigation")}
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className={"full-map-gps-button "+(gpsActive ? "active" : "")}
          aria-label={
            gpsActive
              ? tr("Recentrar GPS","Recenter GPS")
              : tr("Obtener mi ubicación real","Get my current location")
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
          className={"navibori-perspective-button "+(mode==="3d" ? "active" : "")}
          aria-label={mode==="3d"
            ? tr("Cambiar a vista 2D","Switch to 2D view")
            : tr("Cambiar a vista 3D","Switch to 3D view")}
          aria-pressed={mode==="3d"}
          disabled={!mapReady}
          onClick={()=>activateMapMode(mode==="3d" ? "2d" : "3d")}
          title={tr("Cambiar perspectiva del mapa","Switch map perspective")}
        >
          {mode==="3d" ? "2D" : "3D"}
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
          onClick={()=>{
            setSearchOpen(false);
            setMenuOpen((open)=>!open);
          }}
        >
          {menuOpen ? "×" : "☰"}
        </button>

        {gpsActive && (
          <button
            type="button"
            className="navibori-minimal-stop"
            onClick={()=>{
              stopGpsNavigation();
              setLocationStatus(tr("GPS detenido. La ruta permanece visible.","GPS stopped. The route remains visible."));
            }}
            aria-label={tr("Finalizar navegación GPS","End GPS navigation")}
          >
            {tr("Finalizar","End")}
          </button>
        )}

        {navigationPhase!=="idle" && !gpsActive && selected && (
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
              {routeBusy!==null && (
                <small className="navibori-live-reroute" role="status">
                  {tr("Actualizando la ruta…","Updating route…")}
                </small>
              )}
              {gpsActive&&!signal.current&&(
                <small className="navibori-live-gps-warning" role="status">
                  {tr("GPS sin señal reciente · se conserva la última posición.",
                    "GPS not updating · holding the last location.")}
                </small>
              )}
              {gpsActive&&signal.current&&!confidentGpsForRerouting&&(
                <small className="navibori-live-gps-warning" role="status">
                  {tr("GPS impreciso · recálculo automático pausado.",
                    "Low GPS confidence · automatic rerouting paused.")}
                </small>
              )}
              {trajectoryPrediction && trajectoryPrediction.risk!=="stable" && (
                <div
                  className={"trajectory-shield-chip "+trajectoryPrediction.risk}
                  aria-live="assertive"
                >
                  <span>{tr("Aviso de ruta","Route alert")}</span>
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

            </div>

            {gpsActive && (
              <div className="navibori-drive-summary"
                aria-label={tr("Resumen de navegación","Navigation summary")}>
                <div>
                  <span>{tr("Llegada","Arrival")}</span>
                  <strong>{formatArrivalTime(
                    navigationProgress?.remainingSeconds ?? routeResult.durationSeconds,
                    deviceLocale.locale
                  )}</strong>
                </div>
                <div>
                  <span>{tr("Restante","Remaining")}</span>
                  <strong>{formatDistance(
                    navigationProgress?.remainingMeters ?? routeResult.distanceMeters
                  )}</strong>
                </div>
                <button type="button" onClick={recenterGpsCamera}
                  aria-label={tr("Recentrar en mi ubicación","Recenter on my location")}
                  title={tr("Recentrar","Recenter")}>◎</button>
                <button type="button" onClick={()=>{
                  const next=!voiceEnabled;
                  voiceEnabledRef.current=next;
                  setVoiceEnabled(next);
                  if(!next){
                    if("speechSynthesis" in window)window.speechSynthesis.cancel();
                    lastSpokenInstructionRef.current="";
                  }else if(nextCue){
                    speakNavigation(
                      localizeManeuver(nextCue.instruction,deviceLocale.language),
                      nextCue.distanceMeters,true
                    );
                  }
                }} aria-pressed={voiceEnabled}
                  aria-label={voiceEnabled?tr("Silenciar instrucciones","Mute directions"):
                    tr("Activar instrucciones de voz","Enable voice directions")}
                  title={tr("Voz","Voice")}>{voiceEnabled?"🔊":"🔇"}</button>
                {signal.retryRecommended&&!gpsResumePending&&(
                  <button type="button" className="navibori-drive-retry"
                    onClick={()=>{
                      if(gpsResumeFixRef.current)gpsResumeFixRef.current();
                      else if(selected&&canRoute)startGpsNavigation(lastRouteMode);
                      else testGps();
                    }}>{tr("Reintentar GPS","Retry GPS")}</button>
                )}
              </div>
            )}
          </aside>
        )}

        {!gpsActive && (
          <div className="navibori-search-dock">
            <div className="navibori-search-field">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchTerm}
                placeholder={tr("Buscar comercio, categoría o dirección",
                  "Search business, category or address")}
                aria-label={tr("Buscar comercio, categoría o dirección",
                  "Search business, category or address")}
                onFocus={()=>setSearchOpen(true)}
                onChange={(event)=>{
                  setSearchTerm(event.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(event)=>{
                  if(event.key==="Escape"){
                    setSearchOpen(false);
                    event.currentTarget.blur();
                  }
                  if(event.key==="Enter"&&searchResults.length){
                    focusBusiness(searchResults[0]);
                    setSearchTerm("");
                    setSearchOpen(false);
                    event.currentTarget.blur();
                  }
                }}
              />
              {searchTerm.trim()&&(
                <button type="button"
                  aria-label={tr("Borrar búsqueda","Clear search")}
                  onClick={()=>{
                    setSearchTerm("");
                    setSearchOpen(true);
                  }}>×</button>
              )}
            </div>
            {searchOpen&&searchTerm.trim()&&(
              <div className="navibori-search-results"
                aria-label={tr("Resultados de búsqueda","Search results")}>
                {searchResults.length?searchResults.map(business=>(
                  <button type="button" key={business.id}
                    onClick={()=>{
                      focusBusiness(business);
                      setSearchTerm("");
                      setSearchOpen(false);
                    }}>
                    <strong>{business.name}</strong>
                    <small>{business.mapLocation?.address ?? business.locationLabel}</small>
                  </button>
                )):(
                  <p role="status">{tr("No encontramos resultados.",
                    "No results found.")}</p>
                )}
              </div>
            )}
          </div>
        )}

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
                aria-label={tr("Cerrar menú","Close menu")}
              >
                ×
              </button>
            </div>

            <button
              type="button"
              className="navibori-refresh-version"
              disabled={gpsActive}
              title={gpsActive ? tr("Termina la navegación antes de actualizar.","End navigation before refreshing.") : tr("Solicitar una copia nueva de la aplicación.","Request a fresh copy of the application.")}
              onClick={()=>{
                const url=new URL(window.location.href);
                url.searchParams.set("navibori_refresh",Date.now().toString());
                window.location.replace(url.toString());
              }}
            >↻ {tr("Actualizar aplicación","Refresh application")}</button>
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
                <div><dt>{tr("Destino","Destination")}</dt><dd>{demoRoute?signalCopy.route:tr("Comercio","Business")}</dd></div>
                <div><dt>GPS</dt><dd>{gpsActive||navigationPhase!=="idle"?signalCopy.gps:tr("Inactivo","Inactive")}</dd></div>
                <div><dt>{tr("Última lectura","Last fix")}</dt><dd>{gpsAgeSeconds===null?"—":gpsAgeSeconds+" s"}</dd></div>
                <div><dt>{tr("Lecturas seguidas","Accepted GPS fixes")}</dt><dd>{gpsStreamFixCount}</dd></div>
                <div><dt>{tr("Recálculo automático","Automatic rerouting")}</dt><dd>{
                  confidentGpsForRerouting?tr("Disponible","Available"):
                  tr("En espera de GPS preciso","Waiting for accurate GPS")
                }</dd></div>
                <div><dt>{tr("Precisión","Accuracy")}</dt><dd>{gpsAccuracy===null ? "—" : "±"+Math.round(gpsAccuracy)+" m"}</dd></div>
                <div><dt>{tr("Seguimiento","Follow mode")}</dt><dd>{followGps ? tr("Activado","On") : tr("Pausado","Paused")}</dd></div>
                <div><dt>{tr("Ruta","Route")}</dt><dd>{routeResult ? tr("Calculada","Calculated") : tr("Sin ruta","No route")}</dd></div>
                <div><dt>{tr("Dibujo de ruta","Route rendering")}</dt><dd>{routeVisualStatus==="visible" ? tr("Capa instalada","Layer installed") : routeVisualStatus==="error" ? tr("Error de dibujo","Render error") : "—"}</dd></div>
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
                disabled={!userLocation || !mapReady}
                onClick={()=>{
                  recenterGpsCamera();
                  setMenuOpen(false);
                }}
              >{tr("Volver a mi ubicación","Return to my location")}</button>
              {gpsAccuracy!==null && gpsAccuracy>100 && (
                <small role="alert">{tr("Precisión GPS baja (más de 100 m). No dependas de esta ubicación para maniobras.","Low GPS accuracy (over 100 m). Do not rely on this position for maneuvers.")}</small>
              )}
              <button
                type="button"
                className="navibori-diagnostics-copy"
                onClick={async ()=>{
                  setDiagnosticsCopyStatus("idle");
                  const report=[
                    "NAVIBORI diagnostics",
                    "Build: "+buildRevision,
                    "Map: "+basemapState,
                    "Destination type: "+signal.routeKind,
                    "GPS state: "+signal.fix,
                    "Last fix age seconds: "+(gpsAgeSeconds===null?"unknown":gpsAgeSeconds),
                    "Continuous GPS fixes: "+gpsStreamFixCount,
                    "Pending GPS position confirmation: "+String(gpsUnconfirmedJump),
                    "Auto rerouting confidence: "+String(confidentGpsForRerouting),
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
                  className={mode==="3d" ? "active" : ""}
                  onClick={()=>activateMapMode("3d")}
                  aria-pressed={mode==="3d"}
                  title={tr("Vista en perspectiva 3D","3D perspective view")}
                >
                  3D
                </button>
                <button
                  type="button"
                  className={mode==="globe" ? "active" : ""}
                  onClick={()=>activateMapMode("globe")}
                >
                  {deviceLocale.language==="en" ? "Globe" : "Globo"}
                </button>
              </div>
              <div className="novascene-appearance-controls" role="group"
                aria-label={tr("Estilo visual de NovaScene","NovaScene visual style")}>
                <span>{tr("Apariencia de los edificios","Building appearance")}</span>
                <div>
                  <button type="button" className={sceneAppearance==="natural"?"active":""}
                    aria-pressed={sceneAppearance==="natural"}
                    onClick={()=>setSceneAppearance("natural")}>
                    {tr("Natural","Natural")}
                  </button>
                  <button type="button" className={sceneAppearance==="digital"?"active":""}
                    aria-pressed={sceneAppearance==="digital"}
                    onClick={()=>setSceneAppearance("digital")}>
                    {tr("Tecnológico","Digital")}
                  </button>
                </div>
                <small>{tr(
                  "Las alturas no verificadas son aproximaciones visuales. El estilo Natural reduce el volumen de viviendas de altura desconocida.",
                  "Unverified heights are visual estimates. Natural mode reduces the visual volume of buildings without known heights."
                )}</small>
              </div>
              <details className="navibori-health-panel">
                <summary>{tr("Diagnóstico 3D","3D diagnostics")}</summary>
                <div className="navibori-3d-diagnostic-menu" role="status">
                <strong>{tr("NovaScene · motor 3D propio","NovaScene · built-in 3D engine")}</strong>
                <small>{tr("Atlas regional ampliado · alturas orientativas",
                  "Expanded local geographic atlas · illustrative heights")}</small>
                <span>{mode!=="3d"
                  ?tr("Vista 2D o globo seleccionada","2D or globe view selected")
                  :buildings3DState==="loading"
                    ?tr("Consultando y dibujando edificios…","Fetching and drawing buildings…")
                  :buildings3DState==="ready"
                    ?tr(buildingRenderedCount+" estructuras visibles",buildingRenderedCount+" visible structures")
                  :buildings3DState==="no-data"
                    ?tr("No hay geometría 3D visible","No visible 3D geometry")
                    :tr("No se pudieron cargar los edificios","Buildings could not be loaded")}</span>
                {buildingError&&<small>{buildingError}</small>}
                <button type="button" onClick={()=>{
                  if(mode!=="3d")activateMapMode("3d");
                  buildingRefreshRef.current?.(true);
                }}>
                  {tr("Reintentar edificios 3D","Retry 3D buildings")}
                </button>
              </div>
              </details>
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

            <div className="navibori-language-choice" role="group" aria-label={tr("Idioma de navegación","Navigation language")}>
              <span>{tr("Idioma","Language")}</span>
              <button type="button" aria-pressed={deviceLocale.language==="es"} onClick={()=>{
                document.documentElement.dataset.peripheralLocale="es-PR";
                try{window.localStorage.setItem("navibori:preferred-language","es-PR");}catch{}
                window.dispatchEvent(new Event(NAVIBORI_LOCALE_CHANGE_EVENT));
              }}>Español</button>
              <button type="button" aria-pressed={deviceLocale.language==="en"} onClick={()=>{
                document.documentElement.dataset.peripheralLocale="en-US";
                try{window.localStorage.setItem("navibori:preferred-language","en-US");}catch{}
                window.dispatchEvent(new Event(NAVIBORI_LOCALE_CHANGE_EVENT));
              }}>English</button>
              <button type="button" onClick={()=>{
                delete document.documentElement.dataset.peripheralLocale;
                try{window.localStorage.setItem("navibori:preferred-language","auto");}catch{}
                window.dispatchEvent(new Event(NAVIBORI_LOCALE_CHANGE_EVENT));
              }}>{tr("Automático","Auto")}</button>
            </div>
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
            {tr("◎ Recentrar","◎ Recenter")}
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
                    {signalCopy.route} · {signalCopy.gps}
                  </span>
                )}
              </div>

              <strong>{selected.name}</strong>
              <div className="business-route-address-row">
                <span>{selected.demo ? tr("Ubicación de demostración","Demo location") : selected.mapLocation?.address ?? selected.locationLabel}</span>
                <button type="button" onClick={copySelectedAddress}>
                  {addressCopied ? copy.copied : copy.copyAddress}
                </button>
              </div>

              {canRoute ? (
                <>
                  <div className="business-route-launch navibori-ux3-route">
                    {routeResult&&!gpsActive ? (
                      <>
                        <div>
                          <span>{tr("Tu ruta está lista","Your route is ready")}</span>
                          <small>{routeModeLabel(routeResult.mode,deviceLocale.locale)} ·
                            {" "}{formatDuration(routeResult.durationSeconds)} ·
                            {" "}{formatDistance(routeResult.distanceMeters)}</small>
                        </div>
                        <div className="navibori-ux3-route-actions">
                          <button type="button" className="navibori-ux3-primary"
                            onClick={()=>startGpsNavigation(routeResult.mode)}>
                            {tr("Iniciar navegación","Start navigation")}
                          </button>
                          <button type="button" onClick={()=>{
                            routeAbortRef.current?.abort();
                            routeResultRef.current=null;
                            setRouteResult(null);
                            setNavigationPhase("idle");
                            setRouteModePickerOpen(true);
                          }}>
                            {tr("Cambiar transporte","Change travel mode")}
                          </button>
                        </div>
                      </>
                    ) : routeModePickerOpen ? (
                      <>
                        <div>
                          <span>{tr("¿Cómo deseas llegar?","How would you like to get there?")}</span>
                          <small>{tr("Selecciona tu medio de transporte.",
                            "Choose your travel mode.")}</small>
                        </div>
                        <div className="business-route-mode-actions" role="group"
                          aria-label={tr("Medio de transporte","Travel mode")}>
                          {travelModes.map(travel=>(
                            <button type="button" key={travel.value}
                              aria-pressed={lastRouteMode===travel.value}
                              className={lastRouteMode===travel.value?"active":""}
                              disabled={previewingLocation||routeBusy!==null}
                              onClick={()=>setLastRouteMode(travel.value)}>
                              <span aria-hidden="true">{travel.icon}</span>
                              <strong>{copy.modeShort[travel.value]}</strong>
                            </button>
                          ))}
                        </div>
                        <div className="navibori-ux3-route-actions">
                          <button type="button" className="navibori-ux3-primary"
                            disabled={previewingLocation||routeBusy!==null}
                            onClick={()=>void previewSelectedRoute(lastRouteMode)}>
                            {previewingLocation||routeBusy!==null
                              ?tr("Calculando ruta…","Calculating route…")
                              :tr("Ver ruta","View route")}
                          </button>
                          <button type="button" disabled={previewingLocation}
                            onClick={()=>setRouteModePickerOpen(false)}>
                            {tr("Volver","Back")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button type="button" className="navibori-ux3-primary"
                        onClick={()=>setRouteModePickerOpen(true)}>
                        {tr("Cómo llegar","Directions")}
                      </button>
                    )}
                  </div>

                  {arrived && (
                    <div className="navibori-arrival-card" role="status">
                      <span>{tr("Destino alcanzado","Destination reached")}</span>
                      <strong>{tr("Has llegado a ","You have arrived at ")}{selected.name}.</strong>
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
                        {voiceEnabled ? tr("🔊 Voz activada","🔊 Voice on") : tr("🔇 Activar voz","🔇 Enable voice")}
                      </button>
                    )}
                    {routeResult && routeResult.steps.length>0 && (
                      <button
                        type="button"
                        className={directionsOpen ? "active" : ""}
                        onClick={()=>setDirectionsOpen((open)=>!open)}
                      >
                        {tr("🧭 Indicaciones","🧭 Directions")}
                      </button>
                    )}
                    {routeResult && (
                      <button type="button" onClick={showFullRoute}>
                        {tr("🗺️ Ver ruta completa","🗺️ Full route")}
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
                        {tr("Detener GPS","Stop GPS")}
                      </button>
                    )}
                    {routeResult && (
                      <button type="button" onClick={clearRoute}>
                        {tr("Limpiar ruta","Clear route")}
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
                    <Link href={"/comercios/"+selected.slug}>{tr("Ver comercio","View business")}</Link>
                  </div>

                  {demoRoute && (
                    <div className="navibori-demo-route-warning" role="status">
                      {tr("Ruta DEMO: destino ficticio.","DEMO route: fictional destination.")}
                    </div>
                  )}
                  <small>
                    {tr("La navegación depende de la precisión del GPS y la cartografía disponible.",
                      "Navigation depends on GPS accuracy and available map data.")}
                  </small>
                </>
              ) : (
                <>
                  <div className="business-route-actions">
                    <button type="button" disabled>{tr("Ruta pendiente de verificación","Route pending verification")}</button>
                    <Link href={"/comercios/"+selected.slug}>{tr("Ver comercio","View business")}</Link>
                  </div>
                  <small>
                    {tr("Un comercio necesita coordenadas verificadas para navegación real.",
                      "A business needs verified coordinates for live navigation.")}
                  </small>
                </>
              )}
            </>
          ) : (
            <>
              <strong>{tr("Busca un comercio","Find a business")}</strong>
              <span>{tr("Busca arriba o selecciona un pin del mapa.",
                "Search above or select a pin on the map.")}</span>
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
