"use client";

import { useEffect } from "react";

const SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export default function GamepadFocusController() {
  useEffect(() => {
    let frame = 0;
    let lastMove = 0;
    let lastActivate = false;

    function focusable(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none";
        });
    }

    function move(delta: number) {
      const items = focusable();
      if (items.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const index = active ? items.indexOf(active) : -1;
      const nextIndex = index < 0
        ? 0
        : (index + delta + items.length) % items.length;

      items[nextIndex]?.focus({ preventScroll: false });
    }

    function tick(time: number) {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find(Boolean);

      if (pad) {
        const up = Boolean(pad?.buttons[12]?.pressed) || (pad?.axes[1] ?? 0) < -0.65;
        const down = Boolean(pad?.buttons[13]?.pressed) || (pad?.axes[1] ?? 0) > 0.65;
        const left = Boolean(pad?.buttons[14]?.pressed) || (pad?.axes[0] ?? 0) < -0.65;
        const right = Boolean(pad?.buttons[15]?.pressed) || (pad?.axes[0] ?? 0) > 0.65;
        const activate = Boolean(pad?.buttons[0]?.pressed);

        if (time - lastMove > 180) {
          if (down || right) {
            move(1);
            lastMove = time;
          } else if (up || left) {
            move(-1);
            lastMove = time;
          }
        }

        if (activate && !lastActivate) {
          const active = document.activeElement;
          if (active instanceof HTMLElement) {
            active.click();
          }
        }

        lastActivate = activate;
      } else {
        lastActivate = false;
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
