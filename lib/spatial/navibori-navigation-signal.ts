import {gpsFixStatus,type GpsFixStatus} from "./navibori-gps-freshness";

/** A synthetic business destination is not a simulated satellite fix.
 * Present route provenance and live device GPS independently.
 */
export type NavigationSignal={
  routeKind:"demo"|"real";
  fix:GpsFixStatus;
  current:boolean;
  retryRecommended:boolean;
};
export function navigationSignalState(
  demoDestination:boolean,lastFixAt:number|null,now:number
):NavigationSignal{
  const fix=gpsFixStatus(lastFixAt,now);
  return {
    routeKind:demoDestination?"demo":"real",
    fix,
    current:fix==="current",
    retryRecommended:fix!=="current"
  };
}
export function navigationSignalCopy(
  signal:NavigationSignal,language:"es"|"en",
  accuracyMeters:number|null,reconnecting:boolean
):{route:string;gps:string}{
  const en=language==="en";
  const route=signal.routeKind==="demo"
    ?en?"DEMO ROUTE":"RUTA DEMO"
    :en?"REAL ROUTE":"RUTA REAL";
  const gps=reconnecting
    ?en?"Reconnecting GPS":"Reconectando GPS"
    :signal.fix==="waiting"
      ?en?"GPS not yet confirmed":"GPS por confirmar"
      :signal.fix==="stale"
        ?en?"GPS fix not current":"GPS sin señal reciente"
        :accuracyMeters!==null&&Number.isFinite(accuracyMeters)&&accuracyMeters>=0
          ? "GPS ±"+Math.round(accuracyMeters)+" m"
          :en?"GPS location received":"GPS actualizado";
  return {route,gps};
}
