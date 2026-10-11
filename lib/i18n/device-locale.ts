export type NaviboriLanguage="es"|"en";

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

export function browserNaviboriLocale(){
  if(typeof navigator==="undefined"){
    return resolveNaviboriLocale(["es-PR"]);
  }

  const languages=
    navigator.languages?.length
      ? navigator.languages
      : [navigator.language || "es-PR"];

  return resolveNaviboriLocale(languages);
}

const ES={
  now:"Ahora",
  in:"En",
  routeReady:"ruta lista",
  gpsActive:"GPS activo",
  gpsDemoActive:"GPS DEMO activo",
  routeCalculating:"Calculando y dibujando ruta…",
  destinationReached:"Has llegado a tu destino.",
  mode:{
    driving:"En carro",
    walking:"Caminando",
    cycling:"En bicicleta",
    scooter:"En scooter"
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
  mode:{
    driving:"Driving",
    walking:"Walking",
    cycling:"Cycling",
    scooter:"Scooter"
  }
};

export function naviboriCopy(language:NaviboriLanguage){
  return language==="en" ? EN : ES;
}
