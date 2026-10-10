import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import CustomerRequestManager from "@/components/commerce/customer-request-manager";

export default async function CustomerRequestPage({
  params
}:{
  params:Promise<{id:string}>;
}){
  const {id}=await params;

  return (
    <main className="commerce-page">
      <header className="subpage-header">
        <div>
          <NaviboriBrand compact />
          <p className="eyebrow">REQUEST SELF-SERVICE</p>
        </div>
        <div className="subpage-actions">
          <Link href="/comercios">Comercios</Link>
          <Link href="/">Mapa</Link>
        </div>
      </header>

      <CustomerRequestManager requestId={id} />
    </main>
  );
}
