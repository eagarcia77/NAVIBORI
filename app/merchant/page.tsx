import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import MerchantConsole from "@/components/merchant/merchant-console";
import MerchantPulse from "@/components/merchant/merchant-pulse";
import CatalogEditor from "@/components/merchant/catalog-editor";
import MerchantVerification from "@/components/merchant/merchant-verification";
import HoursEditor from "@/components/merchant/hours-editor";
import PromotionEditor from "@/components/merchant/promotion-editor";
import BackendSyncPanel from "@/components/merchant/backend-sync-panel";
import BusinessMediaEditor from "@/components/merchant/business-media-editor";
import MerchantAnalyticsDashboard from "@/components/merchant/merchant-analytics-dashboard";
import CustomerRequestInbox from "@/components/merchant/customer-request-inbox";
import ServiceSettingsEditor from "@/components/merchant/service-settings-editor";
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
          <p>Perfil, oferta y promoción en un flujo preparado para publicación segura.</p>
        </div>
        <div className="subpage-actions">
          <Link href="/comercios">Ver comercios</Link>
          <Link href="/">Volver al mapa</Link>
        </div>
      </header>

      <div className="demo-notice">
        Los editores conservan una copia local. Si la cuenta tiene rol merchant, Backend Sync guarda el borrador real en Supabase bajo RLS. Activación pública requiere revisión del venue.
      </div>

      <MerchantConsole />
      <BackendSyncPanel />
      <BusinessMediaEditor />
      <MerchantQrKit />
      <ServiceSettingsEditor />
      <HoursEditor />
      <CatalogEditor />
      <PromotionEditor />
      <MerchantVerification />
      <CustomerRequestInbox />
      <MerchantAnalyticsDashboard />
      <MerchantPulse />
      <NaviGuide mode="cockpit" />
    </main>
  );
}
