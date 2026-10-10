import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY="BEdUyyPZWN3Hhj-ecrZH-Nxs-reG4eJo3nBwXckRK5J-4pBej6LMYUqkpHw2xix-ak1OgT9OMiwdadHaJJQW8Og";
const VAPID_SUBJECT="https://navibori.onrender.com";

function bytesFromBase64(value:string){
  return Uint8Array.from(atob(value),c=>c.charCodeAt(0));
}
function b64url(data:Uint8Array){
  let binary="";
  for(const byte of data) binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64urlText(value:string){
  return b64url(new TextEncoder().encode(value));
}
async function vapidJwt(endpoint:string,privateKeyB64:string){
  const aud=new URL(endpoint).origin;
  const header=b64urlText(JSON.stringify({typ:"JWT",alg:"ES256"}));
  const payload=b64urlText(JSON.stringify({
    aud,
    exp:Math.floor(Date.now()/1000)+12*60*60,
    sub:VAPID_SUBJECT
  }));
  const unsigned=header+"."+payload;
  const key=await crypto.subtle.importKey(
    "pkcs8",
    bytesFromBase64(privateKeyB64),
    {name:"ECDSA",namedCurve:"P-256"},
    false,
    ["sign"]
  );
  const signature=new Uint8Array(await crypto.subtle.sign(
    {name:"ECDSA",hash:"SHA-256"},
    key,
    new TextEncoder().encode(unsigned)
  ));
  return unsigned+"."+b64url(signature);
}
function admin(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
  return createClient(Deno.env.get("SUPABASE_URL")!,keys.default,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
}
async function sendEmptyPush(endpoint:string,privateKeyB64:string){
  const token=await vapidJwt(endpoint,privateKeyB64);
  return fetch(endpoint,{
    method:"POST",
    headers:{
      "TTL":"86400",
      "Urgency":"normal",
      "Authorization":`vapid t=${token}, k=${VAPID_PUBLIC_KEY}`
    }
  });
}

Deno.serve(async(req)=>{
  if(req.method!=="POST"){
    return Response.json({error:"Método no permitido."},{status:405});
  }

  const supabase=admin();

  const {data:privateKey,error:privateKeyError}=await supabase.rpc("get_navibori_vapid_private");
  if(privateKeyError || typeof privateKey!=="string"){
    return Response.json({error:"push_config_unavailable"},{status:503});
  }

  const nowIso=new Date().toISOString();

  const {data:subscriptions,error:subscriptionsError}=await supabase
    .from("push_subscriptions")
    .select("id,endpoint")
    .eq("specials_enabled",true)
    .limit(1000);

  if(subscriptionsError){
    return Response.json({error:"subscription_query_failed"},{status:500});
  }

  if(!subscriptions?.length){
    return Response.json({
      ok:true,
      checked:0,
      promotionsSent:0,
      deliveries:0,
      failures:0,
      noSubscribers:true
    });
  }

  const {data:promotions,error:promoError}=await supabase
    .from("business_promotions")
    .select("id,business_id,title,starts_at,ends_at,active,created_at")
    .eq("active",true)
    .not("starts_at","is",null)
    .lte("starts_at",nowIso)
    .order("starts_at",{ascending:true})
    .limit(20);

  if(promoError){
    return Response.json({error:"promotion_query_failed"},{status:500});
  }

  const candidates=(promotions ?? []).filter((p:any)=>
    !p.ends_at || Date.parse(p.ends_at)>Date.now()
  );

  let promotionsSent=0;
  let deliveries=0;
  let failures=0;

  for(const promotion of candidates){
    const {data:business}=await supabase
      .from("businesses")
      .select("id,status,verification_status")
      .eq("id",promotion.business_id)
      .maybeSingle();

    if(!business || business.status!=="active" || business.verification_status!=="verified"){
      continue;
    }

    const {data:existing}=await supabase
      .from("promotion_push_dispatches")
      .select("id")
      .eq("promotion_id",promotion.id)
      .maybeSingle();

    if(existing) continue;

    const {data:dispatch,error:dispatchError}=await supabase
      .from("promotion_push_dispatches")
      .insert({
        promotion_id:promotion.id,
        business_id:promotion.business_id,
        dispatch_kind:"scheduled",
        status:"sending"
      })
      .select("id")
      .single();

    if(dispatchError || !dispatch) continue;

    let sent=0;
    let failed=0;

    for(const subscription of subscriptions){
      try{
        const response=await sendEmptyPush(subscription.endpoint,privateKey);
        if(response.ok){
          sent+=1;
          deliveries+=1;
        }else{
          failed+=1;
          failures+=1;
          if(response.status===404 || response.status===410){
            await supabase.from("push_subscriptions")
              .update({specials_enabled:false,updated_at:new Date().toISOString()})
              .eq("id",subscription.id);
          }
        }
      }catch{
        failed+=1;
        failures+=1;
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

    promotionsSent+=1;
  }

  return Response.json({
    ok:true,
    checked:candidates.length,
    promotionsSent,
    deliveries,
    failures
  });
});
