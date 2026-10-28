"use client";

import {useEffect} from "react";
import {
  NAVIBORI_LOCALE_CHANGE_EVENT,
  browserNaviboriLocale
} from "@/lib/i18n/device-locale";

export default function DeviceLanguage(){
  useEffect(()=>{
    const apply=()=>{
      const locale=browserNaviboriLocale();
      const root=document.documentElement;
      root.lang=locale.locale || "es-PR";
      root.dataset.naviboriLanguage=locale.language;
      root.dataset.activeLocale=locale.locale;
      if(!root.dataset.languageSource){
        root.dataset.languageSource=root.dataset.peripheralLocale
          ? "peripheral"
          : "device";
      }
    };

    apply();
    window.addEventListener("languagechange",apply);
    window.addEventListener(NAVIBORI_LOCALE_CHANGE_EVENT,apply);

    return ()=>{
      window.removeEventListener("languagechange",apply);
      window.removeEventListener(NAVIBORI_LOCALE_CHANGE_EVENT,apply);
    };
  },[]);

  return null;
}
