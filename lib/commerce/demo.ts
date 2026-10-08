import type { CommerceProfile } from "./types";

const demoWeek = [
  {day:"mon",opens:"10:00",closes:"18:00",closed:false},
  {day:"tue",opens:"10:00",closes:"18:00",closed:false},
  {day:"wed",opens:"10:00",closes:"18:00",closed:false},
  {day:"thu",opens:"10:00",closes:"18:00",closed:false},
  {day:"fri",opens:"10:00",closes:"19:00",closed:false},
  {day:"sat",opens:"09:00",closes:"19:00",closed:false},
  {day:"sun",opens:null,closes:null,closed:true}
] as const;

export const DEMO_COMMERCE: CommerceProfile[] = [
  {
    id: "demo-food-01",
    name: "Sabores Boricuas · Demo",
    slug: "sabores-boricuas-demo",
    category: "gastronomia",
    description: "Ficha sintética para demostrar menú, promoción y descubrimiento comercial.",
    locationLabel: "Local demo · ubicación no validada",
    verifiedLocation: false,
    mapLocation:{latitude:18.0524,longitude:-66.5055,address:"Punto sintético DEMO",verified:false},
    hours: demoWeek.map((item)=>({...item})),
    offers: [
      { id:"of-1", title:"Plato del día", description:"Producto demostrativo", price:12, currency:"USD", featured:true, available:true },
      { id:"of-2", title:"Café puertorriqueño", price:3, currency:"USD", featured:true, available:true }
    ],
    promotions: [
      { id:"pr-1", title:"Promo demo", description:"Promoción sintética para probar la interfaz.", active:true }
    ],
    tags:["comida","cafe","puerto rico"],
    verification:"unverified",
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
    mapLocation:{latitude:18.0517,longitude:-66.5066,address:"Punto sintético DEMO",verified:false},
    hours: demoWeek.map((item)=>({...item})),
    offers: [
      { id:"of-3", title:"Pieza artesanal", description:"Artículo de demostración", price:24, currency:"USD", featured:true, available:true }
    ],
    promotions: [],
    tags:["artesania","regalos","local"],
    verification:"unverified",
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
    mapLocation:{latitude:18.0520,longitude:-66.5072,address:"Punto sintético DEMO",verified:false},
    hours: demoWeek.map((item)=>({...item})),
    offers: [
      { id:"of-4", title:"Servicio principal", description:"Servicio de demostración", currency:"USD", featured:true, available:true }
    ],
    promotions: [],
    tags:["servicios"],
    verification:"unverified",
    demo:true
  }
];
