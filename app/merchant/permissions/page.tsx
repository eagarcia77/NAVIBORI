import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import NaviboriBrand from "@/components/brand/navibori-brand";
import MerchantPermissionManager from "@/components/merchant/merchant-permission-manager";
import {mayManageMerchantAccess} from "@/lib/auth/merchant-membership";

export const dynamic="force-dynamic";
export const metadata={
  title:"Permisos de comerciantes | NAVIBORI",
  description:"Administración segura de membresías merchant por establecimiento."
};

export default async function MerchantPermissionsPage(){
  const supabase=await createClient();
  const {data:claims,error:claimsError}=await supabase.auth.getClaims();
  if(claimsError||!claims?.claims?.sub)redirect("/login");

  const {data:memberships,error}=await supabase.rpc("my_venue_memberships");
  if(error)throw new Error("No fue posible verificar tus permisos.");
  const adminVenues=(memberships??[])
    .filter(m=>mayManageMerchantAccess([{venueId:m.venue_id,role:m.role}],m.venue_id))
    .map(m=>({id:m.venue_id,name:m.venue_name,role:m.role}));

  return <main className="commerce-page">
    <header className="subpage-header">
      <div>
        <NaviboriBrand compact />
        <p className="eyebrow">ADMINISTRACIÓN · NAVIBORI 3.5</p>
        <h1>Permisos de comerciantes</h1>
        <p>Gestiona el acceso merchant de cada establecimiento sin modificar
          otras cuentas ni conceder permisos de administrador.</p>
      </div>
      <div className="subpage-actions">
        <Link href="/commerce-review">Revisión comercial</Link>
        <Link href="/merchant">Portal de comerciantes</Link>
        <Link href="/">Mapa</Link>
      </div>
    </header>
    <MerchantPermissionManager venues={adminVenues}/>
  </main>;
}
