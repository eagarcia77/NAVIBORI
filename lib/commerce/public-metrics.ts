import { createClient } from "@/lib/supabase/client";
import type { CommerceEventType } from "@/lib/commerce/analytics";

export async function recordPublicBusinessMetric(
  businessId:string,
  event:CommerceEventType
){
  const supabase=createClient();
  const {error}=await supabase.rpc("record_public_business_metric",{
    p_business_id:businessId,
    p_event:event
  });

  if(error) throw error;
}
