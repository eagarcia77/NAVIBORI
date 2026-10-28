"use client";
import {useEffect,useState,type ReactNode} from "react";
import {activateMerchantWorkspace} from "@/lib/commerce/merchant-workspace";
export default function MerchantWorkspace({scope,seed,children}:{scope:string;seed:Record<string,string>;children:ReactNode}){
  const [ready,setReady]=useState(false);
  const [error,setError]=useState(false);
  useEffect(()=>{
    try{activateMerchantWorkspace(localStorage,scope,seed);setReady(true);}catch{setError(true);}
  },[scope,seed]);
  if(error)return <p role="alert">Permite el almacenamiento del navegador para preparar borradores. Tus anuncios guardados siguen disponibles en “Mis anuncios”.</p>;
  if(!ready)return <p role="status">Cargando el espacio de tu comercio…</p>;
  return children;
}
