import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import NaviboriBrand from "@/components/brand/navibori-brand";
import MerchantPromotionManager from "@/components/merchant/merchant-promotion-manager";
import {canManageMerchantPromotion,type MerchantVenueRole} from "@/lib/commerce/merchant-promotion-permissions";

export const dynamic="force-dynamic";
export const metadata={
  title:"Administrar promociones | NAVIBORI",
  description:"Promociones de tus comercios verificados, con permisos individuales."
};

export default async function MerchantPromotionsPage(){
  const supabase=await createClient();
  const {data:claimsData,error:claimsError}=await supabase.auth.getClaims();
  const userId=claimsData?.claims?.sub;
  if(claimsError||!userId)redirect("/login");

  const {data:memberships,error:membershipError}=
    await supabase.rpc("my_venue_memberships");
  if(membershipError)throw new Error("No pudimos verificar tus permisos.");

  const allowedMemberships=(memberships??[])
    .filter(m=>["merchant","platform_owner","municipality_admin","venue_manager"].includes(m.role))
    .map(m=>({venueId:m.venue_id,role:m.role as MerchantVenueRole}));
  const venueIds=[...new Set(allowedMemberships.map(m=>m.venueId))];

  let pendingBusinesses:string[]=[];
  let businesses:Array<{
    id:string;
    name:string;
    status:string;
    verificationStatus:string;
    locationVerified:boolean;
    ownershipVerified:boolean;
  }>=[];
  if(venueIds.length>0){
    const {data,error}=await supabase
      .from("businesses")
      .select("id,name,status,verification_status,created_by,venue_id,location_verified,ownership_verified")
      .eq("created_by",userId)
      .in("venue_id",venueIds)
      .order("name");
    if(error)throw new Error("No pudimos cargar tus comercios.");
    pendingBusinesses=(data??[]).filter(b=>b.verification_status==="pending").map(b=>b.name);
    businesses=(data??[])
      .filter(b=>canManageMerchantPromotion(userId,allowedMemberships,{
        businessId:b.id,createdBy:b.created_by,venueId:b.venue_id,
        status:b.status,verificationStatus:b.verification_status,locationVerified:b.location_verified,ownershipVerified:b.ownership_verified
      },"view"))
      .map(b=>({id:b.id,name:b.name,status:b.status,
        verificationStatus:b.verification_status,locationVerified:b.location_verified,ownershipVerified:b.ownership_verified}));
  }

  return <main className="commerce-page">
    <header className="subpage-header">
      <div>
        <NaviboriBrand compact/>
        <p className="eyebrow">PORTAL DE COMERCIANTES · FASE 1</p>
        <h1>Administrador de promociones</h1>
        <p>Crea, programa, pausa y actualiza ofertas de tus establecimientos.</p>
      </div>
      <div className="subpage-actions">
        <Link href="/merchant">Consola del comercio</Link>
        <Link href="/">Mapa</Link>
      </div>
    </header>
    {pendingBusinesses.length>0&&<p role="status">En revisión: {pendingBusinesses.join(", ")}. Los anuncios se conservan y podrás administrarlos cuando finalice la revisión.</p>}
    {(businesses.length>0||pendingBusinesses.length===0)&&<MerchantPromotionManager businesses={businesses}/>}

  </main>;
}
