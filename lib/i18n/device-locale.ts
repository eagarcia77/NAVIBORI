export type NaviboriLanguage="es"|"en";

export const NAVIBORI_PERIPHERAL_LOCALE_EVENT="navibori:peripheral-locale";
export const NAVIBORI_LOCALE_CHANGE_EVENT="navibori:localechange";

export interface NaviboriLocale{
  language:NaviboriLanguage;
  locale:string;
  speechLocale:string;
  valhallaLocale:string;
}

const SPANISH_PREFIXES=["es"];
const ENGLISH_PREFIXES=["en"];

export function resolveNaviboriLocale(
  languages:readonly string[]|undefined|null
):NaviboriLocale{
  const values=(languages ?? [])
    .map((value)=>value.trim())
    .filter(Boolean);

  const first=values[0] || "es-PR";
  const normalized=first.toLowerCase();

  if(ENGLISH_PREFIXES.some((prefix)=>normalized===prefix || normalized.startsWith(prefix+"-"))){
    return {
      language:"en",
      locale:first,
      speechLocale:first,
      valhallaLocale:first
    };
  }

  if(SPANISH_PREFIXES.some((prefix)=>normalized===prefix || normalized.startsWith(prefix+"-"))){
    return {
      language:"es",
      locale:first,
      speechLocale:first,
      valhallaLocale:first
    };
  }

  return {
    language:"es",
    locale:first,
    speechLocale:"es-PR",
    valhallaLocale:"es-ES"
  };
}

export function normalizeLocaleCandidate(value:unknown){
  if(typeof value!=="string" || !value.trim()) return null;

  try{
    return new Intl.Locale(value.trim()).toString();
  }catch{
    return null;
  }
}

export function resolveActiveNaviboriLocale(
  browserLanguages:readonly string[]|undefined|null,
  peripheralLocale?:string|null
){
  const peripheral=normalizeLocaleCandidate(peripheralLocale);
  if(peripheral){
    return resolveNaviboriLocale([peripheral]);
  }
  return resolveNaviboriLocale(browserLanguages);
}

export function browserNaviboriLocale(){
  if(typeof navigator==="undefined"){
    return resolveNaviboriLocale(["es-PR"]);
  }

  const languages=
    navigator.languages?.length
      ? navigator.languages
      : [navigator.language || "es-PR"];

  const peripheralLocale=
    typeof document!=="undefined"
      ? document.documentElement.dataset.peripheralLocale
      : undefined;

  return resolveActiveNaviboriLocale(languages,peripheralLocale);
}

const ES={
  now:"Ahora",
  in:"En",
  routeReady:"ruta lista",
  gpsActive:"GPS activo",
  gpsDemoActive:"GPS DEMO activo",
  routeCalculating:"Calculando y dibujando ruta…",
  destinationReached:"Has llegado a tu destino.",
  menu:"MENÚ",
  exploreNavigate:"Explorar y navegar",
  searchPlaceholder:"Buscar comercio o dirección",
  noResults:"No se encontraron comercios con esa búsqueda.",
  gps:"GPS",
  testGps:"◎ Probar GPS",
  testGpsAndRoute:"◎ Probar GPS e iniciar ruta",
  testingGps:"Probando…",
  myLocation:"⦿ Mi ubicación",
  recenterGps:"◎ Recentrar GPS",
  diagnoseGps:"Diagnosticar GPS y rutas",
  categories:"Categorías",
  view:"Vista",
  commerce:"Comercios",
  specialsHint:"Activa “Recibir especiales” para recibir promociones LIVE en la aplicación instalada.",
  permissionStep:"1 Permiso",
  gpsStep:"2 GPS",
  routeStep:"3 Ruta",
  navigatingStep:"4 Navegando",
  retryGps:"Reintentar GPS",
  remaining:"Restante",
  speed:"Velocidad",
  excellent:"Excelente",
  good:"Bueno",
  weak:"Débil",
  searching:"Buscando…",
  following:"◎ Siguiendo",
  recenter:"◎ Recentrar",
  voice:"Voz",
  finish:"Finalizar",
  destination:"Destino",
  continue:"Continúa",
  routeDirections:"Indicaciones de la ruta",
  hide:"Ocultar",
  steps:"pasos",
  remainingDistance:"Distancia restante",
  estimatedTime:"Tiempo estimado",
  modeLabel:"Modo",
  copyAddress:"Copiar dirección",
  copied:"✓ Copiada",
  howToGetThere:"¿Cómo quieres llegar?",
  oneTapStarts:"Un toque inicia la ruta y el GPS.",
  category:{
    all:"Todos",
    gastronomia:"Gastronomía",
    compras:"Compras",
    artesania:"Artesanía",
    servicios:"Servicios",
    bienestar:"Bienestar"
  },
  mode:{
    driving:"En carro",
    walking:"Caminando",
    cycling:"En bicicleta",
    scooter:"En scooter"
  },
  modeShort:{
    driving:"Carro",
    walking:"Caminar",
    cycling:"Bicicleta",
    scooter:"Scooter"
  }
};

const EN={
  now:"Now",
  in:"In",
  routeReady:"route ready",
  gpsActive:"GPS active",
  gpsDemoActive:"DEMO GPS active",
  routeCalculating:"Calculating and drawing route…",
  destinationReached:"You have arrived at your destination.",
  menu:"MENU",
  exploreNavigate:"Explore and navigate",
  searchPlaceholder:"Search business or address",
  noResults:"No businesses matched that search.",
  gps:"GPS",
  testGps:"◎ Test GPS",
  testGpsAndRoute:"◎ Test GPS and start route",
  testingGps:"Testing…",
  myLocation:"⦿ My location",
  recenterGps:"◎ Recenter GPS",
  diagnoseGps:"Diagnose GPS and routes",
  categories:"Categories",
  view:"View",
  commerce:"Businesses",
  specialsHint:"Enable “Receive specials” to get LIVE promotions in the installed app.",
  permissionStep:"1 Permission",
  gpsStep:"2 GPS",
  routeStep:"3 Route",
  navigatingStep:"4 Navigating",
  retryGps:"Retry GPS",
  remaining:"Remaining",
  speed:"Speed",
  excellent:"Excellent",
  good:"Good",
  weak:"Weak",
  searching:"Searching…",
  following:"◎ Following",
  recenter:"◎ Recenter",
  voice:"Voice",
  finish:"End",
  destination:"Destination",
  continue:"Continue",
  routeDirections:"Route directions",
  hide:"Hide",
  steps:"steps",
  remainingDistance:"Remaining distance",
  estimatedTime:"Estimated time",
  modeLabel:"Mode",
  copyAddress:"Copy address",
  copied:"✓ Copied",
  howToGetThere:"How do you want to get there?",
  oneTapStarts:"One tap starts the route and GPS.",
  category:{
    all:"All",
    gastronomia:"Food",
    compras:"Shopping",
    artesania:"Crafts",
    servicios:"Services",
    bienestar:"Wellness"
  },
  mode:{
    driving:"Driving",
    walking:"Walking",
    cycling:"Cycling",
    scooter:"Scooter"
  },
  modeShort:{
    driving:"Car",
    walking:"Walk",
    cycling:"Bicycle",
    scooter:"Scooter"
  }
};

export function naviboriCopy(language:NaviboriLanguage){
  return language==="en" ? EN : ES;
}
