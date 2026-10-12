"use client";
import {useMemo,useState} from "react";
import {STORE_PRODUCTS} from "@/lib/store/catalog";

type Draft={sku:string;name:string;price:number;variants:string;stock:string;imageUrl:string;status:"draft"|"ready"};
const STORAGE_KEY="navibori-store-admin-drafts-v1";
const initial:Draft[]=STORE_PRODUCTS.map(p=>({sku:p.sku,name:p.name,price:p.price,variants:p.variants.join(", "),stock:"",imageUrl:"",status:"draft"}));
function load():Draft[]{try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return initial;const parsed:unknown=JSON.parse(raw);if(!Array.isArray(parsed))return initial;return initial.map(base=>{const saved=parsed.find((x:unknown)=>typeof x==="object"&&x!==null&&"sku" in x&&(x as {sku:unknown}).sku===base.sku) as Partial<Draft>|undefined;return saved?{...base,name:typeof saved.name==="string"?saved.name:base.name,price:typeof saved.price==="number"&&Number.isFinite(saved.price)&&saved.price>=0?saved.price:base.price,variants:typeof saved.variants==="string"?saved.variants:base.variants,stock:typeof saved.stock==="string"?saved.stock:"",imageUrl:typeof saved.imageUrl==="string"?saved.imageUrl:"",status:saved.status==="ready"?"ready":"draft"}:base})}catch{return initial}}
export default function StoreDraftEditor(){
const [drafts,setDrafts]=useState<Draft[]>(initial);
const [loaded,setLoaded]=useState(false);
const [message,setMessage]=useState("");
useMemo(()=>null,[]);
function restore(){setDrafts(load());setLoaded(true);setMessage("Borradores recuperados de este navegador.");}
function update(sku:string,patch:Partial<Draft>){setDrafts(items=>items.map(item=>item.sku===sku?{...item,...patch}:item));setMessage("Cambios sin guardar.");}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts));setMessage("Borradores guardados en este navegador; no se han publicado.");}catch{setMessage("No se pudo guardar en este dispositivo.");}}
return <section style={{maxWidth:1050,margin:"auto",padding:"24px 16px"}}>
<h2>Editor de catálogo · borradores locales</h2>
<p>Herramienta de preparación, no panel administrativo seguro. No guarda en Supabase ni publica productos. No introduzcas información confidencial.</p>
<div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"16px 0"}}>
<button type="button" onClick={restore}>Recuperar borradores de este dispositivo</button>
<button type="button" onClick={save} disabled={!loaded}>Guardar borradores locales</button>
</div>
<p role="status">{message||"Los productos oficiales permanecen en modo demostración."}</p>
{loaded&&<div style={{display:"grid",gap:16}}>{drafts.map(p=><fieldset key={p.sku} style={{border:"1px solid #d9e1e5",borderRadius:12,padding:16,background:"white"}}>
<legend><strong>{p.sku}</strong></legend>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
<label>Nombre<input style={{display:"block",width:"100%"}} value={p.name} maxLength={100} onChange={e=>update(p.sku,{name:e.target.value})}/></label>
<label>Precio sugerido (USD)<input style={{display:"block",width:"100%"}} type="number" min="0" step="0.01" value={p.price} onChange={e=>update(p.sku,{price:Math.max(0,Number(e.target.value)||0)})}/></label>
<label>Inventario (sin verificar)<input style={{display:"block",width:"100%"}} type="number" min="0" step="1" value={p.stock} onChange={e=>update(p.sku,{stock:e.target.value.replace(/[^0-9]/g,"")})}/></label>
<label>Variantes (separadas por coma)<input style={{display:"block",width:"100%"}} value={p.variants} onChange={e=>update(p.sku,{variants:e.target.value})}/></label>
<label>URL de foto aprobada<input style={{display:"block",width:"100%"}} type="url" value={p.imageUrl} placeholder="https://..." onChange={e=>update(p.sku,{imageUrl:e.target.value})}/></label>
<label>Estado de preparación<select style={{display:"block",width:"100%"}} value={p.status} onChange={e=>update(p.sku,{status:e.target.value==="ready"?"ready":"draft"})}><option value="draft">Borrador</option><option value="ready">Listo para revisión</option></select></label>
</div></fieldset>)}</div>}
</section>;
}
