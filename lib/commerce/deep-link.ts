export function buildBusinessDeepLink(origin:string,slug:string){
  const base=origin.replace(/\/$/,"");
  return base + "/comercios/" + encodeURIComponent(slug);
}

export function buildBusinessQrPayload(origin:string,slug:string){
  return "NAVIBORI|BUSINESS|" + buildBusinessDeepLink(origin,slug);
}


export type CommerceNavigationMode="driving"|"walking";

export function buildCommerceMapLink(
  slug:string,
  mode?:CommerceNavigationMode
){
  const params=new URLSearchParams();
  params.set("business",slug);
  if(mode) params.set("route",mode);
  return "/?"+params.toString();
}
