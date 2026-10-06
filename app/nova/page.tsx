import Link from "next/link";
import NovaLab from "@/components/nova/nova-lab";

export const metadata = {
  title: "NOVA Lab | NAVIBORI",
  description: "Experimental spatial intelligence capability laboratory."
};

export default function NovaPage() {
  return (
    <main className="nova-shell">
      <header className="nova-header">
        <div>
          <p className="eyebrow">NAVIBORI NOVA LAB</p>
          <h1>Beyond the map.</h1>
          <p>
            Laboratorio experimental para percepción XR, cómputo espacial y capacidades
            emergentes. Ningún indicador implica que el dispositivo o navegador lo soporte.
          </p>
        </div>
        <Link href="/">Volver al mapa</Link>
      </header>
      <NovaLab />
    </main>
  );
}
