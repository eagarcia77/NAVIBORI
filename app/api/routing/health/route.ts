import {NextResponse} from "next/server";
import {
  buildOsrmRouteUrl,
  buildValhallaRouteRequest,
  normalizeOsrmRoute,
  type OsrmRouteResponse
} from "@/lib/commerce/in-map-routing";

export const dynamic="force-dynamic";

const ORIGIN={latitude:18.0520,longitude:-66.5060};
const DESTINATION={latitude:18.0475,longitude:-66.5005};

async function fetchWithTimeout(url:string,init:RequestInit,timeoutMs:number){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{
      ...init,
      cache:"no-store",
      signal:controller.signal,
      headers:{
        "Accept":"application/json",
        "User-Agent":"NAVIBORI/0.1 (+https://navibori.onrender.com)",
        ...(init.headers ?? {})
      }
    });
  }finally{
    clearTimeout(timeout);
  }
}

export async function GET(){
  const result={
    ok:false,
    osrm:false,
    valhalla:false
  };

  try{
    const response=await fetchWithTimeout(
      buildOsrmRouteUrl(ORIGIN,DESTINATION,"driving"),
      {method:"GET"},
      7000
    );

    if(response.ok){
      const data=await response.json() as OsrmRouteResponse;
      result.osrm=Boolean(normalizeOsrmRoute(data,"driving"));
    }
  }catch{}

  try{
    const response=await fetchWithTimeout(
      "https://valhalla1.openstreetmap.de/route",
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(
          buildValhallaRouteRequest(ORIGIN,DESTINATION,"driving")
        )
      },
      8000
    );

    if(response.ok){
      const data=await response.json() as OsrmRouteResponse;
      result.valhalla=Boolean(
        normalizeOsrmRoute(data,"driving","Valhalla / OpenStreetMap")
      );
    }
  }catch{}

  result.ok=result.osrm || result.valhalla;

  return NextResponse.json(result,{
    status:result.ok ? 200 : 503,
    headers:{
      "Cache-Control":"no-store, max-age=0",
      "X-Robots-Tag":"noindex"
    }
  });
}
