/** Device-aware navigation presentation with explicit demo/live distinction. */
const labels={
 es:{demo:"Demostración · Sin navegación GPS real",live:"Navegación GPS",following:"Siguiendo ubicación",voice:"Voz",end:"Finalizar",remaining:"Restante",speed:"Velocidad",eta:"Llegada",turnLeft:"Gira a la izquierda",turnRight:"Gira a la derecha",continue:"Continúa"},
 en:{demo:"Demo · Not live GPS navigation",live:"GPS navigation",following:"Following location",voice:"Voice",end:"End",remaining:"Remaining",speed:"Speed",eta:"ETA",turnLeft:"Turn left",turnRight:"Turn right",continue:"Continue"}
};
export function navigationLocale(languages=["es"]) {
 const first=Array.isArray(languages)?languages[0]:languages;
 return typeof first==="string"&&first.toLowerCase().startsWith("en")?"en":"es";
}
export function navigationLabels(locale="es") {return {...labels[locale==="en"?"en":"es"]};}
export function navigationDisplayState({locale="es",mode="demo",distanceMeters=null,speedMps=null}={}) {
 const l=navigationLabels(locale);
 const formatter=new Intl.NumberFormat(locale==="en"?"en-US":"es-PR",{maximumFractionDigits:1});
 const km=Number.isFinite(distanceMeters)&&distanceMeters>=0?formatter.format(distanceMeters/1000)+" km":"—";
 const speed=Number.isFinite(speedMps)&&speedMps>=0?formatter.format(speedMps*3.6)+" km/h":"—";
 return {locale:locale==="en"?"en":"es",status:mode==="live"?l.live:l.demo,
   isDemo:mode!=="live",remaining:km,speed,labels:l};
}
