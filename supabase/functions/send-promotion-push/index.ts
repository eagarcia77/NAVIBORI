import { createClient } from "npm:@supabase/supabase-js@2.117.2";

import {sendPromotionPush} from "../_shared/web-push.ts";
import {notificationPayload} from "../_shared/push-policy.ts";

function cors(req:Request){
  const origin=req.headers.get("origin") ?? "";
  const allowed=origin==="https://navibori.onrender.com" || origin==="http://localhost:3000";
  return {
    "Access-Control-Allow-Origin":allowed ? origin : "https://navibori.onrender.com",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin"
  };
}
function respond(req:Request,data:unknown,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}
  });
}
function admin(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
  return createClient(Deno.env.get("SUPABASE_URL")!,keys.default,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
}
function activeNow(p:any,now:number){
  const starts=p.starts_at ? Date.parse(p.starts_at) : -Infinity;
  const ends=p.ends_at ? Date.parse(p.ends_at) : Infinity;
  return Boolean(p.active && starts<=now && now<ends);
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors(req)});
  if(req.method!=="POST") return respond(req,{error:"Método no permitido."},405);

  const auth=req.headers.get("authorization") ?? "";
  const token=auth.replace(/^Bearer\s+/i,"");
  if(!token) return respond(req,{error:"Sesión requerida."},401);

  const supabase=admin();

  const {data:privateKey,error:privateKeyError}=await supabase.rpc("get_navibori_vapid_private");
  if(privateKeyError || typeof privateKey!=="string"){
    return respond(req,{error:"Configuración push no disponible."},503);
  }

  const {data:userData,error:userError}=await supabase.auth.getUser(token);
  const user=userData.user;
  if(userError || !user) return respond(req,{error:"Sesión inválida."},401);

  let body:any={};
  try{ body=await req.json(); }catch{ return respond(req,{error:"Solicitud inválida."},400); }

  const businessId=typeof body.businessId==="string" ? body.businessId : "";
  if(!businessId) return respond(req,{error:"Comercio requerido."},400);

  const {data:business,error:businessError}=await supabase
    .from("businesses")
    .select("id,name,slug,status,verification_status,created_by,venue_id,location_verified,ownership_verified")
    .eq("id",businessId)
    .maybeSingle();

  if(businessError || !business) return respond(req,{error:"Comercio no encontrado."},404);
  if(business.created_by!==user.id) return respond(req,{error:"No autorizado para este comercio."},403);

  // Service-role Supabase clients bypass RLS, so the owner must also retain
  // an authorized membership for this business' venue on every push request.
  const {data:membership,error:membershipError}=await supabase
    .from("venue_memberships")
    .select("role")
    .eq("venue_id",business.venue_id)
    .eq("user_id",user.id)
    .in("role",["merchant","platform_owner","municipality_admin","venue_manager"])
    .limit(1);
  if(membershipError||!membership?.length){
    return respond(req,{error:"La membresía de este comercio no está autorizada."},403);
  }
  if(business.status!=="active" ||
     business.verification_status!=="verified" ||
     !business.location_verified || !business.ownership_verified){
    return respond(req,{error:"El comercio debe estar LIVE y verificado."},409);
  }

  const {data:promotions,error:promoError}=await supabase
    .from("business_promotions")
    .select("*")
    .eq("business_id",businessId)
    .eq("active",true);

  if(promoError) return respond(req,{error:"No se pudo consultar la promoción."},500);

  const now=Date.now();
  const promotion=(promotions ?? [])
    .filter((p:any)=>activeNow(p,now)&&(!body.promotionId||p.id===body.promotionId))
    .sort((a:any,b:any)=>Date.parse(b.starts_at ?? b.created_at)-Date.parse(a.starts_at ?? a.created_at))[0];

  if(!promotion){
    return respond(req,{error:"No hay una promoción LIVE activa ahora. Sincroniza primero la promoción."},409);
  }

  const {data:existing}=await supabase
    .from("promotion_push_dispatches")
    .select("id,status,sent_count")
    .eq("promotion_id",promotion.id)
    .maybeSingle();

  if(existing){
    return respond(req,{ok:true,duplicate:true,sentCount:existing.sent_count,status:existing.status});
  }

  const {data:subscriptions,error:subscriptionsError}=await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("specials_enabled",true)
    .limit(1000);

  if(subscriptionsError){
    return respond(req,{error:"No se pudieron consultar suscriptores."},500);
  }

  if(!subscriptions?.length){
    return respond(req,{ok:true,noSubscribers:true,sentCount:0,failedCount:0,status:"waiting"});
  }

  const {data:dispatch,error:dispatchError}=await supabase
    .from("promotion_push_dispatches")
    .insert({
      promotion_id:promotion.id,
      business_id:businessId,
      dispatch_kind:"manual",
      status:"sending",
      created_by:user.id
    })
    .select("id")
    .single();

  if(dispatchError || !dispatch){
    return respond(req,{error:"No se pudo iniciar el envío."},500);
  }

  let sent=0;
  let failed=0;

  for(const subscription of subscriptions){
    try{
      const response=await sendPromotionPush(subscription,privateKey,notificationPayload(business,promotion));
      if(response.ok){
        sent+=1;
      }else{
        failed+=1;
        if(response.status===404 || response.status===410){
          await supabase.from("push_subscriptions")
            .update({specials_enabled:false,updated_at:new Date().toISOString()})
            .eq("id",subscription.id);
        }
      }
    }catch{
      failed+=1;
    }
  }

  const status=failed===0 ? "sent" : sent>0 ? "partial" : "failed";

  await supabase.from("promotion_push_dispatches")
    .update({
      status,
      sent_count:sent,
      failed_count:failed,
      sent_at:new Date().toISOString(),
      error_message:status==="failed" ? "delivery_failed" : null
    })
    .eq("id",dispatch.id);

  return respond(req,{
    ok:status!=="failed",
    promotion:{id:promotion.id,title:promotion.title,businessName:business.name},
    sentCount:sent,
    failedCount:failed,
    status
  },status==="failed" && sent===0 ? 502 : 200);
});
