"use client";

import { useEffect, useState } from "react";
import {validMerchantHours,emptyMerchantHours} from "@/lib/commerce/merchant-hours";
import type { CommerceHours } from "@/lib/commerce/types";

const dayLabels:Record<CommerceHours["day"],string>={
  mon:"Lunes",
  tue:"Martes",
  wed:"Miércoles",
  thu:"Jueves",
  fri:"Viernes",
  sat:"Sábado",
  sun:"Domingo"
};

export default function HoursEditor(){
  const [hours,setHours]=useState<CommerceHours[]>(emptyMerchantHours);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    try{
      const stored=localStorage.getItem("navibori:merchant-hours");
      if(stored){const parsed=JSON.parse(stored);if(validMerchantHours(parsed))setHours(parsed);else setError("Revisa y guarda los siete días del horario. El borrador anterior no tiene un formato válido.");}
    }catch{}
  },[]);

  function update(day:CommerceHours["day"],patch:Partial<CommerceHours>){
    setSaved(false);setError("");
    setHours((current)=>current.map((item)=>item.day===day?{...item,...patch}:item));
  }

  function save(){
    setSaved(false);setError("");
    if(!validMerchantHours(hours)){setError("Completa los siete días. En días abiertos, la hora de cierre debe ser posterior a la apertura.");return;}
    try{
      localStorage.setItem("navibori:merchant-hours",JSON.stringify(hours));
      window.dispatchEvent(new Event("navibori:merchant-hours-updated"));
      setSaved(true);
    }catch{setError("No se pudo guardar el borrador. Verifica el almacenamiento del navegador e inténtalo de nuevo.");}

  }

  return (
    <section className="merchant-hours-editor">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">HORARIOS</p>
          <h2>Horario por día</h2>
        </div>
      </div>

      <p>Indica los días y horas de atención. Este editor admite un intervalo dentro de cada día.</p>
      <div className="merchant-hours-list">
        {hours.map((item)=>(
          <article key={item.day}>
            <strong>{dayLabels[item.day]}</strong>
            <label className="merchant-closed-toggle">
              <input
                type="checkbox"
                checked={item.closed}
                onChange={(e)=>update(item.day,{
                  closed:e.target.checked,
                  opens:e.target.checked?null:(item.opens ?? "10:00"),
                  closes:e.target.checked?null:(item.closes ?? "18:00")
                })}
              />
              Cerrado
            </label>

            <input
              type="time"
              disabled={item.closed}
              value={item.opens ?? ""}
              onChange={(e)=>update(item.day,{opens:e.target.value})}
              aria-label={"Hora de apertura " + dayLabels[item.day]}
            />
            <span>a</span>
            <input
              type="time"
              disabled={item.closed}
              value={item.closes ?? ""}
              onChange={(e)=>update(item.day,{closes:e.target.value})}
              aria-label={"Hora de cierre " + dayLabels[item.day]}
            />
          </article>
        ))}
      </div>

      {error&&<p role="alert">{error}</p>}
      <div className="merchant-actions">
        <button type="button" onClick={save}>Guardar borrador de horarios</button>
        {saved && <span role="status">Borrador guardado en este navegador. Usa “Guardar cambios del comercio” para guardarlo en tu cuenta.</span>}
      </div>
    </section>
  );
}
