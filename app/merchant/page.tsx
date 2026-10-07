import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import MerchantConsole from "@/components/merchant/merchant-console";
import MerchantPulse from "@/components/merchant/merchant-pulse";
import CatalogEditor from "@/components/merchant/catalog-editor";
import MerchantVerification from "@/components/merchant/merchant-verification";
import HoursEditor from "@/components/merchant/hours-editor";
import PromotionEditor from "@/components/merchant/promotion-editor";
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
        Fase 1: los cambios se guardan únicamente como borrador local. Publicación real bloqueada hasta habilitar permisos merchant/RLS.
      </div>

      <MerchantConsole />
      <HoursEditor />
      <CatalogEditor />
      <PromotionEditor />
      <MerchantVerification />
      <MerchantPulse />
      <NaviGuide mode="cockpit" />
    </main>
  );
}
