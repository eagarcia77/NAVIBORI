"use client";
import {useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {closeMerchantWorkspace} from "@/lib/commerce/merchant-workspace";
export default function MerchantSignout(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  return <><button type="button" disabled={busy} onClick={async()=>{
    setBusy(true);setError("");
    try{
      const {error}=await createClient().auth.signOut();
      if(error)throw error;
      try{closeMerchantWorkspace(localStorage);}catch{}
      window.location.assign("/login");
    }catch{setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");setBusy(false);}
  }}>{busy?"Cerrando sesión…":"Cerrar sesión / Cambiar cuenta"}</button>{error&&<p role="alert">{error}</p>}</>;
}
