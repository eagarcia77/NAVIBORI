import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CommerceProfile } from "@/lib/commerce/types";
import { composePublicCommerce } from "@/lib/commerce/public-transform";

export async function getPublicCommerce():Promise<CommerceProfile[]>{
  const supabase=await createClient();

  const {data:businesses,error:businessError}=await supabase
    .from("businesses")
    .select("*")
    .eq("status","active")
    .order("name");

  if(businessError) throw businessError;
  if(!businesses?.length) return [];

  const ids=businesses.map((business)=>business.id);

  const [hoursResult,offersResult,promotionsResult]=await Promise.all([
    supabase
      .from("business_hours")
      .select("*")
      .in("business_id",ids)
      .order("day_of_week"),
    supabase
      .from("business_offers")
      .select("*")
      .in("business_id",ids)
      .order("sort_order"),
    supabase
      .from("business_promotions")
      .select("*")
      .in("business_id",ids)
  ]);

  if(hoursResult.error) throw hoursResult.error;
  if(offersResult.error) throw offersResult.error;
  if(promotionsResult.error) throw promotionsResult.error;

  return composePublicCommerce(
    businesses,
    hoursResult.data ?? [],
    offersResult.data ?? [],
    promotionsResult.data ?? []
  );
}

export async function getPublicCommerceBySlug(
  slug:string
):Promise<CommerceProfile|null>{
  const businesses=await getPublicCommerce();
  return businesses.find((business)=>business.slug===slug) ?? null;
}
