import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CommerceCategory,
  CommerceHours,
  CommerceProfile
} from "@/lib/commerce/types";

type BusinessRow=Database["public"]["Tables"]["businesses"]["Row"];
type HourRow=Database["public"]["Tables"]["business_hours"]["Row"];
type OfferRow=Database["public"]["Tables"]["business_offers"]["Row"];
type PromotionRow=Database["public"]["Tables"]["business_promotions"]["Row"];

const CATEGORY_SET=new Set<CommerceCategory>([
  "gastronomia","compras","servicios","artesania","bienestar","otros"
]);

const DAY_BY_NUMBER:Record<number,CommerceHours["day"]>={
  0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"
};

function normalizeCategory(value:string):CommerceCategory{
  return CATEGORY_SET.has(value as CommerceCategory)
    ? value as CommerceCategory
    : "otros";
}

export function composePublicCommerce(
  businesses:BusinessRow[],
  hours:HourRow[],
  offers:OfferRow[],
  promotions:PromotionRow[]
):CommerceProfile[]{
  return businesses.map((business)=>{
    const businessHours=hours
      .filter((item)=>item.business_id===business.id)
      .sort((a,b)=>a.day_of_week-b.day_of_week)
      .map((item)=>({
        day:DAY_BY_NUMBER[item.day_of_week] ?? "mon",
        opens:item.opens,
        closes:item.closes,
        closed:item.closed
      }));

    const businessOffers=offers
      .filter((item)=>item.business_id===business.id)
      .sort((a,b)=>a.sort_order-b.sort_order)
      .map((item)=>({
        id:item.id,
        title:item.title,
        description:item.description ?? undefined,
        price:item.price ?? undefined,
        currency:"USD" as const,
        featured:item.featured,
        available:item.available,
        sku:item.sku ?? undefined
      }));

    const businessPromotions=promotions
      .filter((item)=>item.business_id===business.id)
      .map((item)=>({
        id:item.id,
        title:item.title,
        description:item.description,
        startsAt:item.starts_at ?? undefined,
        endsAt:item.ends_at ?? undefined,
        active:item.active
      }));

    const verifiedLocation=
      business.verification_status==="verified" &&
      Boolean(business.space_id);

    return {
      id:business.id,
      name:business.name,
      slug:business.slug,
      category:normalizeCategory(business.category),
      description:business.description ?? "",
      phone:business.phone ?? undefined,
      website:business.website ?? undefined,
      locationLabel:verifiedLocation
        ? "Ubicación verificada"
        : "Ubicación pendiente de verificación",
      verifiedLocation,
      hours:businessHours,
      offers:businessOffers,
      promotions:businessPromotions,
      tags:[],
      verification:
        business.verification_status==="verified"
          ? "verified"
          : business.verification_status==="pending"
            ? "pending"
            : "unverified",
      demo:false
    };
  });
}

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
