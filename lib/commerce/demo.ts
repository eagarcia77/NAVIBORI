import type { CommerceProfile } from "./types";

const closedWeek = [
  "mon","tue","wed","thu","fri","sat","sun"
].map((day) => ({
  day: day as "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun",
  opens: null,
  closes: null,
  closed: true
}));

export const DEMO_COMMERCE: CommerceProfile[] = [
  {
    id: "demo-food-01",
    name: "Sabores Boricuas · Demo",
    slug: "sabores-boricuas-demo",
    category: "gastronomia",
    description: "Ficha sintética para demostrar menú, promoción y descubrimiento comercial.",
    locationLabel: "Local demo · ubicación no validada",
    verifiedLocation: false,
    hours: closedWeek,
    offers: [
      { id:"of-1", title:"Plato del día", description:"Producto demostrativo", price:12, currency:"USD", featured:true },
      { id:"of-2", title:"Café puertorriqueño", price:3, currency:"USD", featured:true }
    ],
    promotions: [
      { id:"pr-1", title:"Promo demo", description:"Promoción sintética para probar la interfaz.", active:true }
    ],
    tags:["comida","cafe","puerto rico"],
    demo:true
  },
  {
    id: "demo-craft-01",
    name: "Borinquen Artesanal · Demo",
    slug: "borinquen-artesanal-demo",
    category: "artesania",
    description: "Comercio sintético para probar productos y favoritos.",
    locationLabel: "Local demo · ubicación no validada",
    verifiedLocation: false,
    hours: closedWeek,
    offers: [
      { id:"of-3", title:"Pieza artesanal", description:"Artículo de demostración", price:24, currency:"USD", featured:true }
    ],
    promotions: [],
    tags:["artesania","regalos","local"],
    demo:true
  },
  {
    id: "demo-service-01",
    name: "Servicios Isla · Demo",
    slug: "servicios-isla-demo",
    category: "servicios",
    description: "Ficha sintética para demostrar servicios, contacto y navegación.",
    locationLabel: "Local demo · ubicación no validada",
    verifiedLocation: false,
    hours: closedWeek,
    offers: [
      { id:"of-4", title:"Servicio principal", description:"Servicio de demostración", currency:"USD", featured:true }
    ],
    promotions: [],
    tags:["servicios"],
    demo:true
  }
];
