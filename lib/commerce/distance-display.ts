export type NaviboriDistancePreference="auto"|"imperial"|"metric";
export type NaviboriDistanceUnits="imperial"|"metric";

/** Puerto Rico and the US use miles/feet for road guidance, independently
 * from the language of the interface. Any setting chosen by the user wins. */
export function resolveNaviboriDistanceUnits(
  preference:NaviboriDistancePreference,
  locale:string
):NaviboriDistanceUnits{
  if(preference!=="auto")return preference;
  try{
    const region=new Intl.Locale(locale).region?.toUpperCase();
    return region==="PR"||region==="US"||region==="LR"||region==="MM"
      ?"imperial":"metric";
  }catch{
    return "metric";
  }
}

export function formatNaviboriDistance(
  meters:number,units:NaviboriDistanceUnits
):string{
  if(!Number.isFinite(meters)||meters<0)return "—";
  if(units==="imperial"){
    if(meters<160.9344)return Math.round(meters*3.28084)+" ft";
    return (meters/1609.344).toFixed(1)+" mi";
  }
  if(meters<1000)return Math.round(meters)+" m";
  return (meters/1000).toFixed(1)+" km";
}

export function formatNaviboriManeuverDistance(
  meters:number,language:"es"|"en",units:NaviboriDistanceUnits
):string{
  if(!Number.isFinite(meters)||meters<0)return "—";
  if(meters<30)return language==="en"?"Now":"Ahora";
  const prefix=language==="en"?"In ":"En ";
  if(units==="imperial"){
    if(meters<482.8032)return prefix+Math.max(
      25,Math.round(meters*3.28084/25)*25
    )+" ft";
    return prefix+(meters/1609.344).toFixed(1)+" mi";
  }
  if(meters<1000)return prefix+Math.max(10,Math.round(meters/10)*10)+" m";
  return prefix+(meters/1000).toFixed(1)+" km";
}
