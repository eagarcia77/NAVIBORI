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
type MediaRow=Database["public"]["Tables"]["business_media"]["Row"] & { public_url:string };
type ServiceSettingsRow=Database["public"]["Tables"]["business_service_settings"]["Row"];

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
  promotions:PromotionRow[],
  media:MediaRow[]=[],
  serviceSettings:ServiceSettingsRow[]=[]
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

    const businessMedia=media
      .filter((item)=>item.business_id===business.id)
      .sort((a,b)=>a.sort_order-b.sort_order)
      .map((item)=>({
        id:item.id,
        kind:item.kind as "logo" | "cover" | "gallery",
        url:item.public_url,
        altText:item.alt_text,
        sortOrder:item.sort_order
      }));

    const settings=serviceSettings.find((item)=>item.business_id===business.id);

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
      whatsapp:business.whatsapp ?? undefined,
      website:business.website ?? undefined,
      locationLabel:verifiedLocation
        ? "Ubicación verificada"
        : "Ubicación pendiente de verificación",
      verifiedLocation,
      hours:businessHours,
      offers:businessOffers,
      promotions:businessPromotions,
      tags:[],
      logo:businessMedia.find((item)=>item.kind==="logo"),
      cover:businessMedia.find((item)=>item.kind==="cover"),
      gallery:businessMedia.filter((item)=>item.kind==="gallery"),
      serviceSettings:settings ? {
        acceptsRequests:settings.accepts_requests,
        acceptsPickup:settings.accepts_pickup,
        acceptsReservations:settings.accepts_reservations,
        minLeadMinutes:settings.min_lead_minutes,
        maxAdvanceDays:settings.max_advance_days,
        instructions:settings.instructions ?? undefined
      } : undefined,
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
