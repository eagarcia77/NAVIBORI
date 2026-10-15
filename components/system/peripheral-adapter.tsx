"use client";

import { useEffect } from "react";
import { resolvePeripheralProfile } from "@/lib/interaction/peripheral-profile";
import {
  NAVIBORI_LOCALE_CHANGE_EVENT,
  NAVIBORI_PERIPHERAL_LOCALE_EVENT,
  normalizeLocaleCandidate
} from "@/lib/i18n/device-locale";

export default function PeripheralAdapter() {
  useEffect(() => {
    let penObserved = false;
    let gamepadConnected = navigator.getGamepads?.().some(Boolean) ?? false;

    const coarse = window.matchMedia("(pointer: coarse)");
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 760px)");

    function applyPeripheralLocale(value:unknown) {
      const root = document.documentElement;
      const locale = normalizeLocaleCandidate(value);

      if (locale) {
        root.dataset.peripheralLocale = locale;
        root.dataset.languageSource = "peripheral";
      } else {
        delete root.dataset.peripheralLocale;
        root.dataset.languageSource = "device";
      }

      window.dispatchEvent(new Event(NAVIBORI_LOCALE_CHANGE_EVENT));
    }

    function apply() {
      const nav = navigator as Navigator & { xr?: unknown };
      const profile = resolvePeripheralProfile({
        coarsePointer: coarse.matches,
        finePointer: fine.matches,
        hover: hover.matches,
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
        gamepadConnected,
        xrCapable: Boolean(nav.xr),
        penObserved,
        reducedMotion: reduced.matches,
        compactViewport: compact.matches
      });

      const root = document.documentElement;
      root.dataset.input = profile.primary;
      root.dataset.controls = profile.controlSize;
      root.dataset.density = profile.density;
      root.dataset.hover = profile.hoverAffordances ? "yes" : "no";
      root.dataset.motion = profile.reducedMotion ? "reduced" : "full";
    }

    function onPointer(event: PointerEvent) {
      if (event.pointerType === "pen") {
        penObserved = true;
        apply();
      }
    }

    function onGamepadConnected() {
      gamepadConnected = true;
      apply();
    }

    function onGamepadDisconnected() {
      gamepadConnected = navigator.getGamepads?.().some(Boolean) ?? false;
      apply();
    }

    function onPeripheralLocale(event:Event) {
      const custom=event as CustomEvent<{locale?:string|null}>;
      applyPeripheralLocale(custom.detail?.locale ?? null);
    }

    const hostWindow=window as Window & {
      __NAVIBORI_PERIPHERAL_LOCALE__?:string;
    };
    if(hostWindow.__NAVIBORI_PERIPHERAL_LOCALE__){
      applyPeripheralLocale(hostWindow.__NAVIBORI_PERIPHERAL_LOCALE__);
    }else if(!document.documentElement.dataset.peripheralLocale){
      document.documentElement.dataset.languageSource="device";
    }

    const media = [coarse, fine, hover, reduced, compact];
    media.forEach((query) => query.addEventListener?.("change", apply));
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    window.addEventListener(
      NAVIBORI_PERIPHERAL_LOCALE_EVENT,
      onPeripheralLocale as EventListener
    );

    apply();

    return () => {
      media.forEach((query) => query.removeEventListener?.("change", apply));
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
      window.removeEventListener(
        NAVIBORI_PERIPHERAL_LOCALE_EVENT,
        onPeripheralLocale as EventListener
      );
    };
  }, []);

  return null;
}
