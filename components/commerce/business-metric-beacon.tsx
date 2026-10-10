"use client";

import { useEffect } from "react";
import { recordPublicBusinessMetric } from "@/lib/commerce/public-metrics";

export default function BusinessMetricBeacon({
  businessId,
  enabled
}:{
  businessId:string;
  enabled:boolean;
}){
  useEffect(()=>{
    if(!enabled) return;

    const day=new Date().toISOString().slice(0,10);
    const key="navibori:metric:"+businessId+":"+day+":profile_view";

    if(localStorage.getItem(key)) return;
    localStorage.setItem(key,"1");

    recordPublicBusinessMetric(businessId,"profile_view").catch(()=>{
      localStorage.removeItem(key);
    });
  },[businessId,enabled]);

  return null;
}
