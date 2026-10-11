"use client";

import {useEffect} from "react";
import {browserNaviboriLocale} from "@/lib/i18n/device-locale";

export default function DeviceLanguage(){
  useEffect(()=>{
    const locale=browserNaviboriLocale();
    document.documentElement.lang=locale.locale || "es-PR";
    document.documentElement.dataset.naviboriLanguage=locale.language;
  },[]);

  return null;
}
