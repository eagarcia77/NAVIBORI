import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import MerchantWorkspace from "@/components/merchant/merchant-workspace";
import MerchantSignout from "@/components/merchant/merchant-signout";
import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import MerchantConsole from "@/components/merchant/merchant-console";
import MerchantPulse from "@/components/merchant/merchant-pulse";
import CatalogEditor from "@/components/merchant/catalog-editor";
import MerchantVerification from "@/components/merchant/merchant-verification";
import HoursEditor from "@/components/merchant/hours-editor";
import BackendSyncPanel from "@/components/merchant/backend-sync-panel";
import BusinessMediaEditor from "@/components/merchant/business-media-editor";
import MerchantAnalyticsDashboard from "@/components/merchant/merchant-analytics-dashboard";
import CapacityDashboard from "@/components/merchant/capacity-dashboard";
import MerchantFulfillmentBoard from "@/components/merchant/merchant-fulfillment-board";
import CustomerRequestInbox from "@/components/merchant/customer-request-inbox";
import ServiceSettingsEditor from "@/components/merchant/service-settings-editor";
import FulfillmentBlackoutEditor from "@/components/merchant/fulfillment-blackout-editor";
import MerchantQrKit from "@/components/merchant/merchant-qr-kit";
import NaviGuide from "@/components/brand/navi-guide";

export const metadata = {
  title: "Merchant Console | NAVIBORI XR",
  description: "Consola comercial de NAVIBORI XR."
};

export const dynamic="force-dynamic";
export default async function MerchantPage() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:memberships,error:membershipError}=await supabase.rpc("my_venue_memberships");
  if(membershipError)throw new Error("No pudimos verificar los permisos. Inténtalo de nuevo.");
  const allowed=(memberships??[]).filter(m=>["merchant","platform_owner","municipality_admin","venue_manager"].includes(m.role));
  const {data:owned,error:businessError}=await supabase.from("businesses").select("*").eq("created_by",user.id).order("created_at");
  if(businessError)throw new Error("No pudimos cargar tus comercios.");
  const business=owned?.find(b=>allowed.some(m=>m.venue_id===b.venue_id));
  if(!business)return <main className="commerce-page"><section className="auth-card">
    <h1>Tu cuenta de comerciante</h1><p>Sesión: {user.email}</p>
    {owned?.length?<p>Tu comercio requiere revisar los permisos. Comunícate con el administrador; registrarte nuevamente no recupera un permiso retirado.</p>:
      <><p>Registra tu comercio para preparar sus anuncios y solicitar su publicación.</p><Link href="/merchant/register">Registrar mi comercio</Link></>}
    {allowed.some(m=>m.role!=="merchant")&&<p><Link href="/commerce-review">Revisar comercios</Link></p>}
    <p><Link href="/">Volver al mapa</Link></p><MerchantSignout/>
  </section></main>;
  const [hoursResult,offersResult]=await Promise.all([
    supabase.from("business_hours").select("*").eq("business_id",business.id).order("day_of_week"),
    supabase.from("business_offers").select("*").eq("business_id",business.id).order("sort_order")
  ]);
  if(hoursResult.error||offersResult.error)throw new Error("No pudimos cargar horarios y catálogo.");
  const days=["sun","mon","tue","wed","thu","fri","sat"];
  const seed:Record<string,string>={
    "navibori:merchant-business-id":business.id,
    "navibori:merchant-draft":JSON.stringify({name:business.name,category:business.category,description:business.description??"",phone:business.phone??"",whatsapp:business.whatsapp??"",website:business.website??"",featuredOffer:"",promotion:"",featuredPrice:"",opens:"10:00",closes:"18:00"})
  };
  if(hoursResult.data?.length)seed["navibori:merchant-hours"]=JSON.stringify(hoursResult.data.map(h=>({day:days[h.day_of_week],opens:h.opens?.slice(0,5)??null,closes:h.closes?.slice(0,5)??null,closed:h.closed})));
  if(offersResult.data?.length)seed["navibori:merchant-catalog"]=JSON.stringify(offersResult.data.map(o=>({id:o.id,title:o.title,description:o.description??"",price:o.price?.toString()??"",available:o.available})));

  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">MERCHANT CONSOLE</p>
          <h1>{business.name}</h1>
          <p>Sesión: {user.email} · {business.verification_status==="pending"?"Pendiente de revisión":business.status==="active"?"Publicado":"Borrador"}</p>
          <p>Perfil comercial, catálogo y promociones con revisión y permisos por establecimiento.</p>
        </div>
        <div className="subpage-actions">
          <MerchantSignout/>
          <Link href="/commerce-review">Revisión de comercios</Link>
          <Link href="/merchant/promotions">Mis anuncios</Link>
          <Link href="/comercios">Ver comercios</Link>
          <Link href="/">Volver al mapa</Link>
        </div>
      </header>

      <div className="demo-notice">
        Guarda los borradores de perfil, horarios y catálogo y luego usa “Guardar cambios del comercio” para guardarlos en tu cuenta. Los anuncios se administran por separado. Publicar el negocio requiere revisión.
      </div>

      <MerchantWorkspace key={user.id+":"+business.id+":"+business.updated_at} scope={user.id+":"+business.id} seed={seed}>
      <MerchantConsole />
      <BackendSyncPanel />
      <BusinessMediaEditor />
      <MerchantQrKit />
      <ServiceSettingsEditor />
      <FulfillmentBlackoutEditor />
      <HoursEditor />
      <CatalogEditor />
      <section className="merchant-promotion-entry">
        <div>
          <h2>Promociones de tus comercios</h2>
          <p>Crea, programa, activa y pausa promociones con tu cuenta merchant.
            Los cambios se guardan en Supabase y requieren permisos del comercio.</p>
        </div>
        <Link href="/merchant/promotions">Administrar promociones</Link>
      </section>
      <MerchantVerification locationVerified={business.location_verified} ownerMembershipVerified={true} published={business.status==="active"&&business.verification_status==="verified"}/>
      <CustomerRequestInbox />
      <MerchantFulfillmentBoard />
      <CapacityDashboard />
      <MerchantAnalyticsDashboard />
      <MerchantPulse />
      </MerchantWorkspace>
      <NaviGuide mode="cockpit" />
    </main>
  );
}
