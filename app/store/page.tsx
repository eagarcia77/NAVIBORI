import Link from "next/link";
import NaviGuide from "@/components/brand/navi-guide";
import NaviboriBrand from "@/components/brand/navibori-brand";
import {STORE_PRODUCTS} from "@/lib/store/catalog";
export const metadata={title:"NAVIBORI Store | NAVIBORI XR",description:"Catálogo preliminar de artículos oficiales NAVIBORI XR"};
export default function StorePage(){return <main style={{minHeight:"100vh",background:"#f4f5f6",padding:"clamp(16px,4vw,48px)",color:"#103245"}}>
<header style={{maxWidth:1100,margin:"0 auto 28px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
<NaviboriBrand compact/><Link href="/" style={{color:"#005f8f",fontWeight:700}}>← Volver al mapa</Link></header>
<section style={{maxWidth:1100,margin:"auto"}}>
<p style={{color:"#005f8f",fontWeight:700,letterSpacing:2}}>NAVIBORI XR · OFFICIAL COLLECTION</p>
<h1 style={{fontSize:"clamp(2rem,5vw,3.5rem)"}}>NAVIBORI Store</h1>
<p>Explora. Descubre. Vive Puerto Rico.</p>
<div role="status" style={{padding:16,background:"#e8f4f5",border:"1px solid #9bcbd0",borderRadius:12,margin:"24px 0"}}>Catálogo en preparación. Productos y precios propuestos; compras, inventario y envíos todavía no están disponibles.</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18}}>
{STORE_PRODUCTS.map(p=><article key={p.sku} style={{background:"white",border:"1px solid #d9e1e5",borderRadius:18,padding:20}}>
<div style={{height:125,display:"grid",placeItems:"center",background:"#f4f5f6",borderRadius:12,marginBottom:16}}>
<img src="/brand/navibori-app-icon.webp" alt="Identidad oficial NAVIBORI" style={{width:74,height:74,objectFit:"contain"}}/></div>
<small style={{color:"#667884"}}>{p.category} · {p.sku}</small><h2 style={{fontSize:"1.15rem",margin:"10px 0"}}>{p.name}</h2>
<p style={{minHeight:48}}>{p.description}</p><strong style={{color:"#005f8f"}}>${p.price.toFixed(2)} USD</strong>
<p style={{fontSize:12,color:"#667884"}}>Variantes propuestas: {p.variants.join(", ")}</p>
<button type="button" disabled aria-label={`Compra de ${p.name} próximamente`} style={{width:"100%",border:0,borderRadius:12,padding:12,background:"#e3e8eb",color:"#53646e",cursor:"not-allowed"}}>Próximamente</button>
</article>)}</div>
<footer style={{padding:"36px 0",color:"#667884"}}>NAVIBORI XR · Puerto Rico Spatial Experience Platform · Colección en desarrollo</footer>
</section><NaviGuide mode="cockpit"/></main>}