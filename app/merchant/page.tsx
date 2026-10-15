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

export default function MerchantPage() {
  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">MERCHANT CONSOLE</p>
          <h1>Gestiona tu presencia</h1>
          <p>Perfil comercial, catálogo y promociones con revisión y permisos por establecimiento.</p>
        </div>
        <div className="subpage-actions">
          <Link href="/comercios">Ver comercios</Link>
          <Link href="/">Volver al mapa</Link>
        </div>
      </header>

      <div className="demo-notice">
        Algunos editores preparan borradores locales. El administrador de promociones guarda cada oferta por separado en Supabase y verifica la membresía del comercio. La activación pública del establecimiento requiere revisión.
      </div>

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
      <MerchantVerification />
      <CustomerRequestInbox />
      <MerchantFulfillmentBoard />
      <CapacityDashboard />
      <MerchantAnalyticsDashboard />
      <MerchantPulse />
      <NaviGuide mode="cockpit" />
    </main>
  );
}
