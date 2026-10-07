import type { CommerceHours } from "./types";

const DAYS: CommerceHours["day"][] = [
  "sun","mon","tue","wed","thu","fri","sat"
];

function toMinutes(value: string): number {
  const [hours,minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCommerceOpenState(
  hours: CommerceHours[],
  at: Date = new Date()
): { open: boolean; label: string; next?: string } {
  const day = DAYS[at.getDay()];
  const today = hours.find((item)=>item.day===day);

  if (!today || today.closed || !today.opens || !today.closes) {
    return { open:false, label:"Cerrado" };
  }

  const current = at.getHours()*60 + at.getMinutes();
  const opens = toMinutes(today.opens);
  const closes = toMinutes(today.closes);
  const open = current >= opens && current < closes;

  return {
    open,
    label: open ? "Abierto ahora" : "Cerrado",
    next: open ? "Cierra " + today.closes : current < opens ? "Abre " + today.opens : undefined
  };
}
