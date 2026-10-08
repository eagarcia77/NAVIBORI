"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOwnedMerchantBusiness } from "@/lib/commerce/backend-sync";

type Method="pickup"|"reservation";

type SlotRow={
  slot_start:string;
  capacity:number;
  active_count:number;
  available:boolean;
};

type CapacitySlot=SlotRow & {
  method:Method;
  date:string;
};

function dateInTimeZone(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone,
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).formatToParts(date);

  const get=(type:string)=>parts.find((part)=>part.type===type)?.value ?? "";
  return get("year")+"-"+get("month")+"-"+get("day");
}

function addDays(value:string,days:number){
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}

function occupancy(slot:CapacitySlot){
  if(slot.capacity<=0) return 0;
  return Math.min(100,Math.round((slot.active_count/slot.capacity)*100));
}

export default function CapacityDashboard(){
  const [slots,setSlots]=useState<CapacitySlot[]>([]);
  const [timezone,setTimezone]=useState("America/Puerto_Rico");
  const [status,setStatus]=useState("Cargando capacidad…");

  useEffect(()=>{
    let active=true;

    (async()=>{
      try{
        const business=await getOwnedMerchantBusiness();
        if(!active) return;

        if(!business){
          setStatus("Conecta primero un comercio para ver capacidad.");
          return;
        }

        if(business.status!=="active"){
          setStatus("El dashboard de capacidad estará disponible cuando el comercio esté activo.");
          return;
        }

        const supabase=createClient();
        const {data:settings,error:settingsError}=await supabase
          .from("business_service_settings")
          .select("*")
          .eq("business_id",business.id)
          .maybeSingle();

        if(settingsError) throw settingsError;
        if(!settings){
          setStatus("Configura pickup o reservaciones para activar capacidad.");
          return;
        }

        setTimezone(settings.timezone);

        const methods:Method[]=[];
        if(settings.accepts_pickup) methods.push("pickup");
        if(settings.accepts_reservations) methods.push("reservation");

        if(methods.length===0){
          setStatus("Activa pickup o reservaciones para ver capacidad.");
          return;
        }

        const today=dateInTimeZone(new Date(),settings.timezone);
        const tasks:Array<PromiseLike<CapacitySlot[]>>=[];

        for(let offset=0;offset<7;offset++){
          const date=addDays(today,offset);

          for(const method of methods){
            tasks.push(
              supabase
                .rpc("get_business_fulfillment_slots",{
                  p_business_id:business.id,
                  p_fulfillment_method:method,
                  p_local_date:date
                })
                .then(({data,error})=>{
                  if(error) throw error;
                  return ((data ?? []) as SlotRow[]).map((slot)=>({
                    ...slot,
                    method,
                    date
                  }));
                })
            );
          }
        }

        const result=(await Promise.all(tasks)).flat();
        if(!active) return;

        setSlots(result);
        setStatus(
          result.length
            ? "Capacidad de los próximos 7 días."
            : "No hay slots publicados para los próximos 7 días."
        );
      }catch(error){
        if(active){
          setStatus(error instanceof Error ? error.message : "No se pudo cargar la capacidad.");
        }
      }
    })();

    return ()=>{active=false};
  },[]);

  const summary=useMemo(()=>{
    const totalCapacity=slots.reduce((sum,slot)=>sum+slot.capacity,0);
    const used=slots.reduce((sum,slot)=>sum+slot.active_count,0);
    const high=slots.filter((slot)=>{
      const value=occupancy(slot);
      return value>=80 && value<100;
    }).length;
    const full=slots.filter((slot)=>occupancy(slot)>=100 || !slot.available && slot.active_count>=slot.capacity).length;

    return {totalCapacity,used,high,full};
  },[slots]);

  const visible=useMemo(
    ()=>slots.filter((slot)=>slot.active_count>0 || occupancy(slot)>=80 || !slot.available),
    [slots]
  );

  function formatDate(value:string){
    const [y,m,d]=value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PR",{
      timeZone:"UTC",
      weekday:"short",
      month:"short",
      day:"numeric"
    }).format(new Date(Date.UTC(y,m-1,d)));
  }

  function formatTime(value:string){
    return new Intl.DateTimeFormat("es-PR",{
      timeZone:timezone,
      hour:"numeric",
      minute:"2-digit"
    }).format(new Date(value));
  }

  return (
    <section className="merchant-capacity-dashboard">
      <div className="merchant-section-head">
        <div>
          <p className="eyebrow">CAPACITY</p>
          <h2>Capacidad · próximos 7 días</h2>
        </div>
      </div>

      <p className="merchant-analytics-status" role="status">{status}</p>

      <div className="merchant-capacity-summary">
        <article>
          <span>Ocupados</span>
          <strong>{summary.used}</strong>
        </article>
        <article>
          <span>Capacidad</span>
          <strong>{summary.totalCapacity}</strong>
        </article>
        <article>
          <span>80%+</span>
          <strong>{summary.high}</strong>
        </article>
        <article>
          <span>Llenos</span>
          <strong>{summary.full}</strong>
        </article>
      </div>

      <div className="merchant-capacity-list">
        {visible.map((slot)=>{
          const percent=occupancy(slot);
          const remaining=Math.max(0,slot.capacity-slot.active_count);
          const level=percent>=100
            ? "full"
            : percent>=80
              ? "high"
              : "normal";

          return (
            <article key={slot.method+slot.slot_start} className={"capacity-slot "+level}>
              <div>
                <span>{slot.method==="pickup" ? "Pickup" : "Reservación"}</span>
                <strong>{formatDate(slot.date)} · {formatTime(slot.slot_start)}</strong>
              </div>

              <div className="capacity-meter" aria-label={percent+"% ocupado"}>
                <span style={{width:percent+"%"}} />
              </div>

              <div className="capacity-slot-count">
                <b>{slot.active_count}/{slot.capacity}</b>
                <small>{remaining} libres</small>
              </div>
            </article>
          );
        })}

        {visible.length===0 && slots.length>0 && (
          <p className="merchant-empty">
            No hay slots con ocupación o alertas para los próximos 7 días.
          </p>
        )}

        {slots.length===0 && (
          <p className="merchant-empty">Sin capacidad publicada para mostrar.</p>
        )}
      </div>

      <small>
        Alertas de 80%+ ayudan a anticipar saturación. Slots bloqueados o llenos no se ofrecen al visitante.
      </small>
    </section>
  );
}
