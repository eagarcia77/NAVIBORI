/** Shared car-display navigation payload, without platform-specific UI assumptions. */
export type CarNavigationPayload={
  destination:{id:string;name:string;latitude:number;longitude:number};
  maneuver:{instruction:string;distanceMeters:number}|null;
  remainingMeters:number;
  etaSeconds:number;
  routeCoordinates:Array<[number,number]>;
  isDemo:boolean;
};
const valid=(n:number)=>Number.isFinite(n);
export function validateCarNavigationPayload(p:CarNavigationPayload):CarNavigationPayload{
  if(!p||!p.destination||typeof p.destination.id!=="string"||!p.destination.id||
    typeof p.destination.name!=="string"||!p.destination.name.trim()||
    !valid(p.destination.latitude)||Math.abs(p.destination.latitude)>90||
    !valid(p.destination.longitude)||Math.abs(p.destination.longitude)>180||
    !valid(p.remainingMeters)||p.remainingMeters<0||
    !valid(p.etaSeconds)||p.etaSeconds<0||
    !Array.isArray(p.routeCoordinates)||p.routeCoordinates.length<2||
    p.routeCoordinates.length>20000||
    !p.routeCoordinates.every(([lng,lat])=>valid(lng)&&Math.abs(lng)<=180&&valid(lat)&&Math.abs(lat)<=90)||
    (p.maneuver!==null&&(!p.maneuver||typeof p.maneuver.instruction!=="string"||
      !valid(p.maneuver.distanceMeters)||p.maneuver.distanceMeters<0))||
    typeof p.isDemo!=="boolean") throw new TypeError("Invalid car navigation payload");
  return p;
}
export function carNavigationStatus(p:CarNavigationPayload){
  validateCarNavigationPayload(p);
  return p.isDemo?"demo":"navigation";
}
