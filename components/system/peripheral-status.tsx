"use client";

import { useEffect, useState } from "react";

export default function PeripheralStatus() {
  const [label, setLabel] = useState("Adaptive");

  useEffect(() => {
    const update = () => {
      const value = document.documentElement.dataset.input ?? "adaptive";
      setLabel(value.charAt(0).toUpperCase() + value.slice(1));
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-input"]
    });

    return () => observer.disconnect();
  }, []);

  return (
    <span className="peripheral-status" title="Interfaz adaptativa por periférico">
      Input · {label}
    </span>
  );
}
