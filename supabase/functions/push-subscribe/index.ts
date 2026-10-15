import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY="BEdUyyPZWN3Hhj-ecrZH-Nxs-reG4eJo3nBwXckRK5J-4pBej6LMYUqkpHw2xix-ak1OgT9OMiwdadHaJJQW8Og";
const allowedOrigins=new Set([
  "https://navibori.onrender.com",
  "http://localhost:3000"
]);

function cors(req:Request){
  const origin=req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin":allowedOrigins.has(origin) ? origin : "https://navibori.onrender.com",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin"
  };
}
function json(req:Request,data:unknown,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}
  });
}
function uuid(value:unknown):value is string{
  return typeof value==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function admin(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
  return createClient(Deno.env.get("SUPABASE_URL")!,keys.default,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors(req)});
  if(req.method!=="POST") return json(req,{error:"Método no permitido."},405);

  const origin=req.headers.get("origin");
  if(origin && !allowedOrigins.has(origin)){
    return json(req,{error:"Origen no permitido."},403);
  }

  let body:any={};
  try{ body=await req.json(); }catch{ return json(req,{error:"Solicitud inválida."},400); }

  if(body.action==="config"){
    return json(req,{publicKey:VAPID_PUBLIC_KEY});
  }

  const installationId=body.installationId;
  if(!uuid(installationId)) return json(req,{error:"Instalación inválida."},400);

  const endpoint=typeof body.endpoint==="string" ? body.endpoint.trim() : "";
  if(!endpoint.startsWith("https://") || endpoint.length>2048){
    return json(req,{error:"Suscripción push inválida."},400);
  }

  const supabase=admin();

  if(body.action==="unsubscribe"){
    const {error}=await supabase
      .from("push_subscriptions")
      .update({specials_enabled:false,updated_at:new Date().toISOString()})
      .eq("installation_id",installationId)
      .eq("endpoint",endpoint);
    if(error) return json(req,{error:"No se pudo desactivar la suscripción."},500);
    return json(req,{ok:true,enabled:false});
  }

  if(body.action!=="subscribe") return json(req,{error:"Acción inválida."},400);

  const p256dh=typeof body?.keys?.p256dh==="string" ? body.keys.p256dh : "";
  const authKey=typeof body?.keys?.auth==="string" ? body.keys.auth : "";
  if(p256dh.length<20 || p256dh.length>512 || authKey.length<8 || authKey.length>256){
    return json(req,{error:"Claves push inválidas."},400);
  }

  const now=new Date().toISOString();
  const {error}=await supabase
    .from("push_subscriptions")
    .upsert({
      installation_id:installationId,
      endpoint,
      p256dh,
      auth:authKey,
      specials_enabled:true,
      user_agent:(req.headers.get("user-agent") ?? "").slice(0,500) || null,
      updated_at:now,
      last_seen_at:now
    },{onConflict:"endpoint"});

  if(error) return json(req,{error:"No se pudo guardar la suscripción."},500);
  return json(req,{ok:true,enabled:true});
});
