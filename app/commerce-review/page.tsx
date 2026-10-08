import Link from "next/link";
import { redirect } from "next/navigation";
import NaviboriBrand from "@/components/brand/navibori-brand";
import CommerceReviewConsole, {
  type ReviewSpace
} from "@/components/commerce/commerce-review-console";
import { createClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";

const ADMIN_ROLES=[
  "platform_owner",
  "municipality_admin",
  "venue_manager"
];

export default async function CommerceReviewPage(){
  const supabase=await createClient();
  const {data:claimsData,error:claimsError}=await supabase.auth.getClaims();

  if(claimsError || !claimsData?.claims?.sub){
    redirect("/login");
  }

  const userId=claimsData.claims.sub;
  const {data:memberships,error:membershipError}=await supabase.rpc("my_venue_memberships");

  if(membershipError){
    throw new Error(membershipError.message);
  }

  const adminMembership=memberships?.find((membership)=>
    ADMIN_ROLES.includes(membership.role)
  );

  if(!adminMembership){
    return (
      <main className="commerce-page">
        <header className="subpage-header">
          <div>
            <NaviboriBrand compact />
            <p className="eyebrow">COMMERCE REVIEW</p>
            <h1>Acceso restringido</h1>
            <p>Esta función requiere un rol administrativo del venue.</p>
          </div>
          <div className="subpage-actions">
            <Link href="/merchant">Merchant Console</Link>
            <Link href="/">Mapa</Link>
          </div>
        </header>
      </main>
    );
  }

  const venueId=adminMembership.venue_id;

  const {data:businesses,error:businessError}=await supabase
    .from("businesses")
    .select("*")
    .eq("venue_id",venueId)
    .eq("verification_status","pending")
    .order("updated_at",{ascending:true});

  if(businessError){
    throw new Error(businessError.message);
  }

  const {data:buildings,error:buildingError}=await supabase
    .from("buildings")
    .select("id,name")
    .eq("venue_id",venueId)
    .order("name");

  if(buildingError){
    throw new Error(buildingError.message);
  }

  const buildingIds=(buildings ?? []).map((building)=>building.id);
  let floors:Array<{id:string;building_id:string;name:string;level:number}>=[];
  let spaces:Array<{id:string;floor_id:string;name:string}>=[];

  if(buildingIds.length>0){
    const {data:floorRows,error:floorError}=await supabase
      .from("floors")
      .select("id,building_id,name,level")
      .in("building_id",buildingIds)
      .order("sort_order");

    if(floorError){
      throw new Error(floorError.message);
    }

    floors=floorRows ?? [];
    const floorIds=floors.map((floor)=>floor.id);

    if(floorIds.length>0){
      const {data:spaceRows,error:spaceError}=await supabase
        .from("spaces")
        .select("id,floor_id,name")
        .in("floor_id",floorIds)
        .eq("is_public",true)
        .order("name");

      if(spaceError){
        throw new Error(spaceError.message);
      }

      spaces=spaceRows ?? [];
    }
  }

  const reviewSpaces:ReviewSpace[]=spaces.map((space)=>{
    const floor=floors.find((item)=>item.id===space.floor_id);
    const building=buildings?.find((item)=>item.id===floor?.building_id);

    return {
      id:space.id,
      label:[
        building?.name,
        floor?.name,
        space.name
      ].filter(Boolean).join(" · ")
    };
  });

  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">COMMERCE REVIEW · {adminMembership.role}</p>
          <h1>Revisión de comercios</h1>
          <p>{adminMembership.venue_name} · valida titularidad, ubicación y publicación.</p>
        </div>
        <div className="subpage-actions">
          <Link href="/merchant">Merchant Console</Link>
          <Link href="/comercios">Directorio</Link>
          <Link href="/">Mapa</Link>
        </div>
      </header>

      <div className="live-data-notice">
        La activación requiere una dirección pública y coordenadas verificadas. El espacio interior es opcional hasta completar el levantamiento.
      </div>

      <CommerceReviewConsole
        businesses={businesses ?? []}
        spaces={reviewSpaces}
        currentUserId={userId}
      />
    </main>
  );
}
