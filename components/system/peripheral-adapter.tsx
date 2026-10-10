"use client";

import { useEffect } from "react";
import { resolvePeripheralProfile } from "@/lib/interaction/peripheral-profile";

export default function PeripheralAdapter() {
  useEffect(() => {
    let penObserved = false;
    let gamepadConnected = navigator.getGamepads?.().some(Boolean) ?? false;

    const coarse = window.matchMedia("(pointer: coarse)");
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 760px)");

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

    const media = [coarse, fine, hover, reduced, compact];
    media.forEach((query) => query.addEventListener?.("change", apply));
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    apply();

    return () => {
      media.forEach((query) => query.removeEventListener?.("change", apply));
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
    };
  }, []);

  return null;
}
