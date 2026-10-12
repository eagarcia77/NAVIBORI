import Link from "next/link";
import NaviboriBrand from "@/components/brand/navibori-brand";
import StoreDraftEditor from "@/components/store/store-draft-editor";
export const metadata={title:"Borradores de tienda | NAVIBORI XR"};
export default function StoreDraftPage(){return <main style={{background:"#f4f5f6",minHeight:"100vh",color:"#103245"}}>
<header style={{padding:"20px clamp(16px,4vw,48px)",background:"white",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}><NaviboriBrand compact/><nav aria-label="Navegación de tienda"><Link href="/store">Ver catálogo</Link> · <Link href="/">Mapa</Link></nav></header>
<StoreDraftEditor/></main>}