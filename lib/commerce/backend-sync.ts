import { createClient } from "@/lib/supabase/client";
import { slugifyBusinessName } from "@/lib/commerce/slug";
import type { CommerceHours } from "@/lib/commerce/types";

type MerchantDraft = {
  name:string;
  category:string;
  description:string;
  phone:string;
  website:string;
};

type LocalCatalogItem = {
  id:string;
  title:string;
  description:string;
  price:string;
  available:boolean;
};

type LocalPromotion = {
  id:string;
  title:string;
  description:string;
  startsAt?:string;
  endsAt?:string;
  active:boolean;
};

const DAY_NUMBER:Record<CommerceHours["day"],number>={
  sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6
};

export type MerchantBackendContext = {
  mode:"anonymous"|"no-role"|"authorized";
  userId?:string;
  venueId?:string;
  role?:string;
};

export async function resolveMerchantBackendContext():Promise<MerchantBackendContext>{
  const supabase=createClient();
  const {data:{user},error:userError}=await supabase.auth.getUser();

  if(userError || !user){
    return {mode:"anonymous"};
  }

  const {data:memberships,error:membershipError}=await supabase.rpc("my_venue_memberships");
  if(membershipError){
    throw membershipError;
  }

  const membership=memberships?.find((item)=>
    ["merchant","platform_owner","municipality_admin","venue_manager"].includes(item.role)
  );

  if(!membership){
    return {mode:"no-role",userId:user.id};
  }

  return {
    mode:"authorized",
    userId:user.id,
    venueId:membership.venue_id,
    role:membership.role
  };
}

export type OwnedMerchantBusiness={
  id:string;
  status:string;
  verificationStatus:string;
  name:string;
};

export async function getOwnedMerchantBusiness(
  context?:MerchantBackendContext
):Promise<OwnedMerchantBusiness|null>{
  const resolved=context ?? await resolveMerchantBackendContext();
  if(resolved.mode!=="authorized" || !resolved.userId || !resolved.venueId){
    return null;
  }

  const supabase=createClient();
  const {data,error}=await supabase
    .from("businesses")
    .select("id,status,verification_status,name")
    .eq("created_by",resolved.userId)
    .eq("venue_id",resolved.venueId)
    .order("created_at",{ascending:true})
    .limit(1)
    .maybeSingle();

  if(error) throw error;
  if(!data) return null;

  return {
    id:data.id,
    status:data.status,
    verificationStatus:data.verification_status,
    name:data.name
  };
}

export async function saveMerchantDraftToBackend(draft:MerchantDraft){
  const supabase=createClient();
  const context=await resolveMerchantBackendContext();

  if(context.mode!=="authorized" || !context.userId || !context.venueId){
    return {context,businessId:null,businessStatus:null};
  }

  const existing=await getOwnedMerchantBusiness(context);

  if(existing?.status==="active" || existing?.verificationStatus==="pending"){
    localStorage.setItem("navibori:merchant-business-id",existing.id);
    return {
      context,
      businessId:existing.id,
      businessStatus:existing.status,
      verificationStatus:existing.verificationStatus
    };
  }

  const payload={
    venue_id:context.venueId,
    created_by:context.userId,
    name:draft.name.trim(),
    slug:slugifyBusinessName(draft.name),
    category:draft.category,
    description:draft.description.trim() || null,
    phone:draft.phone.trim() || null,
    website:draft.website.trim() || null,
    status:"draft",
    verification_status:existing?.verificationStatus ?? "unverified"
  };

  if(existing){
    const {data,error}=await supabase
      .from("businesses")
      .update(payload)
      .eq("id",existing.id)
      .select("id,status,verification_status")
      .single();

    if(error) throw error;
    localStorage.setItem("navibori:merchant-business-id",data.id);
    return {
      context,
      businessId:data.id,
      businessStatus:data.status,
      verificationStatus:data.verification_status
    };
  }

  const {data,error}=await supabase
    .from("businesses")
    .insert(payload)
    .select("id,status,verification_status")
    .single();

  if(error) throw error;
  localStorage.setItem("navibori:merchant-business-id",data.id);
  return {
    context,
    businessId:data.id,
    businessStatus:data.status,
    verificationStatus:data.verification_status
  };
}

export async function syncLocalMerchantContent(businessId:string){
  const supabase=createClient();

  const hours:CommerceHours[]=JSON.parse(
    localStorage.getItem("navibori:merchant-hours") ?? "[]"
  );
  const catalog:LocalCatalogItem[]=JSON.parse(
    localStorage.getItem("navibori:merchant-catalog") ?? "[]"
  );
  const promotion:LocalPromotion|null=JSON.parse(
    localStorage.getItem("navibori:merchant-promotion") ?? "null"
  );

  const normalizedHours=hours.map((item)=>({
    day_of_week:DAY_NUMBER[item.day],
    opens:item.closed?null:item.opens,
    closes:item.closed?null:item.closes,
    closed:item.closed
  }));

  const normalizedOffers=catalog.map((item,index)=>({
    title:item.title,
    description:item.description || null,
    price:item.price ? Number(item.price) : null,
    featured:index===0,
    available:item.available,
    sku:null,
    sort_order:index
  }));

  const normalizedPromotions=promotion && promotion.title.trim()
    ? [{
        title:promotion.title,
        description:promotion.description,
        starts_at:promotion.startsAt || null,
        ends_at:promotion.endsAt || null,
        active:promotion.active
      }]
    : [];

  const {error}=await supabase.rpc("sync_merchant_business_content",{
    p_business_id:businessId,
    p_hours:normalizedHours,
    p_offers:normalizedOffers,
    p_promotions:normalizedPromotions
  });

  if(error) throw error;
  return true;
}

export async function submitMerchantBusinessForReview(businessId:string){
  const supabase=createClient();
  const {data,error}=await supabase.rpc("submit_merchant_business_for_review",{
    p_business_id:businessId
  });
  if(error) throw error;
  return data;
}
