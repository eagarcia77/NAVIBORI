import {NextResponse} from "next/server";
import {
  buildOsrmRouteUrl,
  buildValhallaRouteRequest,
  isPuertoRicoCoordinate,
  normalizeOsrmRoute,
  type InMapRouteMode,
  type OsrmRouteResponse,
  type RoutingCoordinate
} from "@/lib/commerce/in-map-routing";

export const dynamic="force-dynamic";

type RoutingQueueGlobal=typeof globalThis & {
  __naviboriRoutingQueue?:Promise<void>;
  __naviboriRoutingLastStart?:number;
};

function validMode(value:unknown):value is InMapRouteMode{
  return (
    value==="driving" ||
    value==="walking" ||
    value==="cycling" ||
    value==="scooter"
  );
}

function coordinateFrom(value:unknown):RoutingCoordinate|null{
  if(!value || typeof value!=="object") return null;
  const candidate=value as {latitude?:unknown;longitude?:unknown};
  if(
    typeof candidate.latitude!=="number" ||
    typeof candidate.longitude!=="number"
  ){
    return null;
  }

  const coordinate={
    latitude:candidate.latitude,
    longitude:candidate.longitude
  };

  return isPuertoRicoCoordinate(coordinate) ? coordinate : null;
}

async function withRoutingThrottle<T>(task:()=>Promise<T>):Promise<T>{
  const state=globalThis as RoutingQueueGlobal;
  const previous=state.__naviboriRoutingQueue ?? Promise.resolve();

  let resolveQueue:()=>void=()=>{};
  const queueTurn=new Promise<void>((resolve)=>{
    resolveQueue=resolve;
  });

  state.__naviboriRoutingQueue=previous
    .catch(()=>{})
    .then(async()=>{
      const now=Date.now();
      const elapsed=now-(state.__naviboriRoutingLastStart ?? 0);
      const wait=Math.max(0,1100-elapsed);

      if(wait>0){
        await new Promise((resolve)=>setTimeout(resolve,wait));
      }

      state.__naviboriRoutingLastStart=Date.now();
      resolveQueue();
    });

  await queueTurn;

  try{
    return await task();
  }finally{
    // The next queued request will still respect the 1 request/second start interval.
  }
}

export async function POST(request:Request){
  let body:unknown;

  try{
    body=await request.json();
  }catch{
    return NextResponse.json(
      {error:"Solicitud de ruta inválida."},
      {status:400,headers:{"Cache-Control":"no-store"}}
    );
  }

  const payload=body as {
    mode?:unknown;
    origin?:unknown;
    destination?:unknown;
    locale?:unknown;
  };

  const locale=
    typeof payload.locale==="string" && payload.locale.trim()
      ? payload.locale.slice(0,35)
      : "es-ES";

  if(!validMode(payload.mode)){
    return NextResponse.json(
      {error:"Modo de ruta inválido."},
      {status:400,headers:{"Cache-Control":"no-store"}}
    );
  }

  const origin=coordinateFrom(payload.origin);
  const destination=coordinateFrom(payload.destination);

  if(!origin || !destination){
    return NextResponse.json(
      {error:"La ruta debe comenzar y terminar dentro de Puerto Rico."},
      {status:400,headers:{"Cache-Control":"no-store"}}
    );
  }

  async function fetchJson(
    url:string,
    init:RequestInit,
    timeoutMs:number
  ){
    return withRoutingThrottle(async()=>{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),timeoutMs);

      try{
        return await fetch(url,{
          ...init,
          headers:{
            "Accept":"application/json",
            "User-Agent":"NAVIBORI/0.1 (+https://navibori.onrender.com)",
            ...(init.headers ?? {})
          },
          cache:"no-store",
          signal:controller.signal
        });
      }finally{
        clearTimeout(timeout);
      }
    });
  }

  const primaryUrl=buildOsrmRouteUrl(origin,destination,payload.mode);

  try{
    try{
      const response=await fetchJson(
        primaryUrl,
        {method:"GET"},
        10000
      );

      if(response.ok){
        const data=await response.json() as OsrmRouteResponse;
        const route=normalizeOsrmRoute(
          data,
          payload.mode,
          "OSRM / OpenStreetMap",
          locale
        );

        if(route){
          return NextResponse.json(route,{
            headers:{
              "Cache-Control":"no-store, max-age=0",
              "X-Robots-Tag":"noindex",
              "X-NAVIBORI-Routing-Provider":"osrm"
            }
          });
        }
      }
    }catch{
      // Fall through to Valhalla.
    }

    const fallbackResponse=await fetchJson(
      "https://valhalla1.openstreetmap.de/route",
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(
          buildValhallaRouteRequest(
            origin,
            destination,
            payload.mode,
            locale
          )
        )
      },
      12000
    );

    if(!fallbackResponse.ok){
      return NextResponse.json(
        {error:"Los servicios de rutas no respondieron correctamente."},
        {status:502,headers:{"Cache-Control":"no-store"}}
      );
    }

    const fallbackData=await fallbackResponse.json() as OsrmRouteResponse;
    const fallbackRoute=normalizeOsrmRoute(
      fallbackData,
      payload.mode,
      "Valhalla / OpenStreetMap",
      locale
    );

    if(!fallbackRoute){
      return NextResponse.json(
        {error:fallbackData.message || "No se encontró una ruta disponible."},
        {status:404,headers:{"Cache-Control":"no-store"}}
      );
    }

    return NextResponse.json(fallbackRoute,{
      headers:{
        "Cache-Control":"no-store, max-age=0",
        "X-Robots-Tag":"noindex",
        "X-NAVIBORI-Routing-Provider":"valhalla"
      }
    });
  }catch(error){
    const message=
      error instanceof Error && error.name==="AbortError"
        ? "Los servicios de rutas excedieron el tiempo de espera."
        : "No se pudo calcular la ruta en este momento.";

    return NextResponse.json(
      {error:message},
      {status:503,headers:{"Cache-Control":"no-store"}}
    );
  }
}
