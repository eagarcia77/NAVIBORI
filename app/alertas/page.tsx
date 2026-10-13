import type {Metadata} from "next";
import Link from "next/link";
import RoadSafetyPanel from "@/components/road-safety/road-safety-panel";

export const metadata:Metadata={
  title:"Alertas viales GPS | NAVIBORI",
  description:"Avisos viales locales según GPS. No detecta físicamente emisiones de radar ni láser."
};

export default function RoadSafetyPage(){
  return (
    <main>
      <RoadSafetyPanel />
      <footer style={{textAlign:"center",padding:"0 16px 24px",fontSize:13,color:"#53697a"}}>
        <Link href="/" style={{color:"#005f8f"}}>← NAVIBORI Maps</Link>
        {" · "}La ubicación permanece en este dispositivo en esta versión.
      </footer>
    </main>
  );
}
