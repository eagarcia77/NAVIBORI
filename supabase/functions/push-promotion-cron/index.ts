import { createClient } from "npm:@supabase/supabase-js@2.117.2";

import {sendPromotionPush} from "../_shared/web-push.ts";
import {notificationPayload} from "../_shared/push-policy.ts";

function admin(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
  return createClient(Deno.env.get("SUPABASE_URL")!,keys.default,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
}
Deno.serve(async(req)=>{
  if(req.method!=="POST"){
    return Response.json({error:"Método no permitido."},{status:405});
  }

  const supplied=req.headers.get("x-navibori-cron-token");
  if(!supplied)return Response.json({error:"cron_auth_required"},{status:401});
  const supabase=admin();
  const {data:cronToken,error:cronError}=await supabase.rpc("get_navibori_push_cron_token");
  if(cronError||typeof cronToken!=="string"||supplied!==cronToken){
    return Response.json({error:"cron_auth_invalid"},{status:401});
  }

  const {data:privateKey,error:privateKeyError}=await supabase.rpc("get_navibori_vapid_private");
  if(privateKeyError || typeof privateKey!=="string"){
    return Response.json({error:"push_config_unavailable"},{status:503});
  }


  const {data:subscriptions,error:subscriptionsError}=await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
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

  const {data:promotions,error:promoError}=await supabase.rpc("due_promotion_pushes");

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
      .select("id,name,slug,status,verification_status,location_verified,ownership_verified")
      .eq("id",promotion.business_id)
      .maybeSingle();

    if(!business || business.status!=="active" || business.verification_status!=="verified" || !business.location_verified || !business.ownership_verified){
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
        const response=await sendPromotionPush(subscription,privateKey,notificationPayload(business,promotion));
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
