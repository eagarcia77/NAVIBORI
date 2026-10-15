"use client";

import {useCallback,useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Venue={id:string;name:string;role:string};
type Membership={user_id:string;email:string;created_at:string};

export default function MerchantPermissionManager({venues}:{venues:Venue[]}){
  const [venueId,setVenueId]=useState(venues[0]?.id??"");
  const [members,setMembers]=useState<Membership[]>([]);
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [pendingRevocation,setPendingRevocation]=useState<Membership|null>(null);

  const reload=useCallback(async(id:string,active?:()=>boolean)=>{
    if(!id){setMembers([]);return;}
    setLoading(true);
    try{
      const client=createClient();
      const {data,error:dbError}=await client.rpc("list_merchant_venue_access",{p_venue_id:id});
      if(dbError)throw dbError;
      if(!active||active())setMembers(data??[]);
    }catch(caught){
      if(!active||active()){
        setMembers([]);
        setError(caught instanceof Error?caught.message:"No se pudo cargar la lista.");
      }
    }finally{
      if(!active||active())setLoading(false);
    }
  },[]);

  useEffect(()=>{
    let active=true;
    setMembers([]);
    setPendingRevocation(null);
    setEmail("");
    setMessage("");
    setError("");
    void reload(venueId,()=>active);
    return ()=>{active=false;};
  },[venueId,reload]);

  async function grant(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||!venueId)return;
    setError("");setMessage("");
    setBusy(true);
    try{
      const normalized=email.trim().toLowerCase();
      if(normalized.length<5||normalized.length>254||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)){
        throw new Error("Introduce un correo electrónico válido.");
      }
      const client=createClient();
      const {data,error:dbError}=await client.rpc("grant_merchant_venue_access",{
        p_venue_id:venueId,p_email:normalized
      });
      if(dbError)throw dbError;
      setEmail("");
      await reload(venueId);
      setMessage(data?
        "Acceso merchant asignado. Se registró en la auditoría.":
        "Esta cuenta ya tenía acceso merchant al establecimiento.");
    }catch(caught){
      setError(caught instanceof Error?caught.message:"No se pudo asignar el permiso.");
    }finally{setBusy(false);}
  }

  async function revoke(){
    if(!pendingRevocation||busy||!venueId)return;
    const target=pendingRevocation;
    setBusy(true);setError("");setMessage("");
    try{
      const client=createClient();
      const {data,error:dbError}=await client.rpc("revoke_merchant_venue_access",{
        p_venue_id:venueId,p_user_id:target.user_id
      });
      if(dbError)throw dbError;
      await reload(venueId);
      setMessage(data?
        "Acceso merchant revocado y registrado en auditoría.":
        "Ese permiso ya no estaba activo.");
      setPendingRevocation(null);
    }catch(caught){
      setError(caught instanceof Error?caught.message:"No se pudo revocar el acceso.");
    }finally{setBusy(false);}
  }

  if(!venues.length)return <section className="merchant-permissions-admin">
    <h2>Acceso restringido</h2>
    <p>No tienes una membresía administrativa para administrar comerciantes
      de ningún establecimiento. Un administrador ya autorizado debe configurar
      tu acceso; el registro de una cuenta no concede permisos.</p>
  </section>;

  return <section className="merchant-permissions-admin"
    aria-label="Administración de permisos de comerciantes">
    <div className="merchant-section-head">
      <div>
        <p className="eyebrow">ACCESO Y SEGURIDAD</p>
        <h2>Permisos de comerciantes</h2>
        <p>Solo puedes administrar cuentas del establecimiento donde tienes
          un rol administrativo. Los cambios se verifican en la base de datos.</p>
      </div>
    </div>

    <label className="merchant-permissions-field">
      Establecimiento
      <select value={venueId} onChange={e=>setVenueId(e.target.value)}
        disabled={busy}>
        {venues.map(venue=><option key={venue.id} value={venue.id}>
          {venue.name} · {venue.role}
        </option>)}
      </select>
    </label>

    <form className="merchant-permissions-add" onSubmit={event=>void grant(event)}>
      <div>
        <h3>Asignar permiso merchant</h3>
        <p>La persona debe tener una cuenta registrada y su correo confirmado
          en NAVIBORI. No se conceden privilegios administrativos.</p>
      </div>
      <label className="merchant-permissions-field">
        Correo electrónico de la cuenta
        <input type="email" autoComplete="off" required maxLength={254}
          placeholder="comerciante@ejemplo.com" value={email}
          onChange={event=>setEmail(event.target.value)}
          disabled={busy}/>
      </label>
      <button type="submit" disabled={busy||loading||!venueId}>
        {busy?"Procesando…":"Asignar acceso merchant"}
      </button>
    </form>

    <div className="merchant-permissions-roster">
      <h3>Comerciantes autorizados</h3>
      {loading?<p role="status">Consultando permisos…</p>:
        members.length===0?<p>No hay comerciantes con este permiso.</p>:
        <ul>
          {members.map(member=><li key={member.user_id}>
            <div>
              <strong>{member.email}</strong>
              <small>merchant · {new Date(member.created_at).toLocaleDateString()}</small>
            </div>
            <button type="button" disabled={busy}
              onClick={()=>setPendingRevocation(member)}>
              Revocar permiso
            </button>
          </li>)}
        </ul>}
    </div>

    {pendingRevocation&&<div className="merchant-permissions-confirm"
      role="alertdialog" aria-modal="true"
      aria-labelledby="merchant-permissions-confirm-title">
      <h3 id="merchant-permissions-confirm-title">¿Revocar acceso merchant?</h3>
      <p>La cuenta <strong>{pendingRevocation.email}</strong> perderá el permiso
        de administrar promociones y operaciones de este establecimiento.
        Esta acción no eliminará sus promociones.</p>
      <div className="merchant-permissions-confirm-actions">
        <button type="button" disabled={busy}
          onClick={()=>setPendingRevocation(null)}>Cancelar</button>
        <button type="button" disabled={busy}
          onClick={()=>void revoke()}>Confirmar revocación</button>
      </div>
    </div>}

    {message&&<p role="status" className="merchant-promotion-success">{message}</p>}
    {error&&<p role="alert" className="merchant-promotion-error">{error}</p>}
    <small>La asignación de roles como platform_owner, municipality_admin y
      venue_manager no está disponible en este módulo. Los cambios se registran
      en la auditoría del establecimiento.</small>
  </section>;
}
