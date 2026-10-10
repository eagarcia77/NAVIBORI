"use client";

import { useEffect, useState } from "react";
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

const initial:CommerceHours[]=[
  {day:"mon",opens:"10:00",closes:"18:00",closed:false},
  {day:"tue",opens:"10:00",closes:"18:00",closed:false},
  {day:"wed",opens:"10:00",closes:"18:00",closed:false},
  {day:"thu",opens:"10:00",closes:"18:00",closed:false},
  {day:"fri",opens:"10:00",closes:"19:00",closed:false},
  {day:"sat",opens:"09:00",closes:"19:00",closed:false},
  {day:"sun",opens:null,closes:null,closed:true}
];

export default function HoursEditor(){
  const [hours,setHours]=useState<CommerceHours[]>(initial);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    try{
      const stored=localStorage.getItem("navibori:merchant-hours");
      if(stored) setHours(JSON.parse(stored));
    }catch{}
  },[]);

  function update(day:CommerceHours["day"],patch:Partial<CommerceHours>){
    setSaved(false);
    setHours((current)=>current.map((item)=>item.day===day?{...item,...patch}:item));
  }

  function save(){
    localStorage.setItem("navibori:merchant-hours",JSON.stringify(hours));
    window.dispatchEvent(new Event("navibori:merchant-hours-updated"));
    setSaved(true);
  }

  return (
    <section className="merchant-hours-editor">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">HORARIOS</p>
          <h2>Horario por día</h2>
        </div>
      </div>

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

      <div className="merchant-actions">
        <button type="button" onClick={save}>Guardar horarios</button>
        {saved && <span role="status">Horarios guardados.</span>}
      </div>
    </section>
  );
}
