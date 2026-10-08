import {NextResponse} from "next/server";
import {
  buildOsrmRouteUrl,
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
  return value==="driving" || value==="walking";
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
  };

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

  const url=buildOsrmRouteUrl(origin,destination,payload.mode);

  try{
    const response=await withRoutingThrottle(async()=>{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),12000);

      try{
        return await fetch(url,{
          method:"GET",
          headers:{
            "Accept":"application/json",
            "User-Agent":"NAVIBORI/0.1 (+https://navibori.onrender.com)"
          },
          cache:"no-store",
          signal:controller.signal
        });
      }finally{
        clearTimeout(timeout);
      }
    });

    if(!response.ok){
      return NextResponse.json(
        {error:"El servicio de rutas no respondió correctamente."},
        {status:502,headers:{"Cache-Control":"no-store"}}
      );
    }

    const data=await response.json() as OsrmRouteResponse;
    const route=normalizeOsrmRoute(data,payload.mode);

    if(!route){
      return NextResponse.json(
        {error:data.message || "No se encontró una ruta disponible."},
        {status:404,headers:{"Cache-Control":"no-store"}}
      );
    }

    return NextResponse.json(route,{
      headers:{
        "Cache-Control":"no-store, max-age=0",
        "X-Robots-Tag":"noindex"
      }
    });
  }catch(error){
    const message=
      error instanceof Error && error.name==="AbortError"
        ? "El cálculo de la ruta excedió el tiempo de espera."
        : "No se pudo calcular la ruta en este momento.";

    return NextResponse.json(
      {error:message},
      {status:503,headers:{"Cache-Control":"no-store"}}
    );
  }
}
