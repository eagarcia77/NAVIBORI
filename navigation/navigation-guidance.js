/** Pure navigation presentation helpers. Route geometry comes from the routing service. */
const translations = {
  es: { left:"Gira a la izquierda",right:"Gira a la derecha",straight:"Continúa recto",arrive:"Has llegado a tu destino",reroute:"Recalculando ruta",gps:"Buscando señal GPS",meters:"m",kilometers:"km",feet:"pies",miles:"mi" },
  en: { left:"Turn left",right:"Turn right",straight:"Continue straight",arrive:"You have arrived",reroute:"Recalculating route",gps:"Acquiring GPS signal",meters:"m",kilometers:"km",feet:"ft",miles:"mi" }
};
export function localeFromLanguage(language = "es") {
  return String(language).toLowerCase().startsWith("es") ? "es" : "en";
}
export function navigationText(key, language = "es") {
  return translations[localeFromLanguage(language)][key] ?? key;
}
export function formatDistance(meters, language = "es", units = "metric") {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  const t = translations[localeFromLanguage(language)];
  const formatter = new Intl.NumberFormat(localeFromLanguage(language), { maximumFractionDigits: 1 });
  if (units === "imperial") {
    const feet = meters * 3.28084;
    return feet < 528 ? `${Math.round(feet / 10) * 10} ${t.feet}` : `${formatter.format(feet / 5280)} ${t.miles}`;
  }
  return meters < 1000 ? `${Math.round(meters / 10) * 10} ${t.meters}` : `${formatter.format(meters / 1000)} ${t.kilometers}`;
}
export function formatSpeed(speedMps, language = "es", units = "metric") {
  if (!Number.isFinite(speedMps) || speedMps < 0) return "—";
  return `${Math.round(speedMps * (units === "imperial" ? 2.236936 : 3.6))} ${units === "imperial" ? "mph" : "km/h"}`;
}
