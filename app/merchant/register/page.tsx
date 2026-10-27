import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {registerBusiness} from "./actions";
export const dynamic="force-dynamic";
export default async function RegisterBusiness({searchParams}:{searchParams:Promise<{error?:string}>}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:venues,error}=await supabase.rpc("merchant_registration_venues");
  const params=await searchParams;
  return <main className="commerce-page"><section className="auth-card">
    <h1>Registra tu comercio</h1>
    <p>Completa el perfil para preparar anuncios. Publicar requiere revisar la titularidad y la ubicación.</p>
    {params.error&&<p role="alert">{params.error}</p>}
    {error&&<p role="alert">No se pudieron cargar los recintos. Inténtalo más tarde.</p>}
    {!error&&!!venues?.length&&<form action={registerBusiness} className="auth-form">
      <label>Recinto o piloto<select name="venue" required>{venues.map(v=><option key={v.id} value={v.id}>{v.name}{v.status==="draft"?" · Piloto en preparación":""}</option>)}</select></label>
      <label>Nombre del comercio<input name="name" minLength={2} maxLength={120} required/></label>
      <label>Categoría<select name="category"><option value="gastronomia">Gastronomía</option><option value="compras">Compras</option><option value="artesania">Artesanía</option><option value="servicios">Servicios</option><option value="bienestar">Bienestar</option><option value="otros">Otros</option></select></label>
      <label>Descripción<textarea name="description" minLength={10} maxLength={2000} required rows={4}/></label>
      <label>Teléfono<input name="phone" type="tel" maxLength={40}/></label>
      <label>WhatsApp<input name="whatsapp" type="tel" placeholder="+17875551234" maxLength={30}/></label>
      <label>Sitio web<input name="website" type="url" maxLength={2048} placeholder="https://"/></label>
      <label>Dirección del comercio<input name="address" maxLength={500}/></label>
      <p>Incluye al menos un medio de contacto. La dirección se verificará antes de publicarse.</p>
      <label><input type="checkbox" name="accept" value="yes" required/> Estoy autorizado para administrar este comercio.</label>
      <button type="submit">Registrar comercio y preparar anuncios</button>
    </form>}
    {!error&&!venues?.length&&<p>No hay recintos disponibles para registro todavía.</p>}
    <Link href="/merchant">Volver a mi comercio</Link>
  </section></main>;
}
