export function buildBusinessDeepLink(origin:string,slug:string){
  const base=origin.replace(/\/$/,"");
  return base + "/comercios/" + encodeURIComponent(slug);
}

export function buildBusinessQrPayload(origin:string,slug:string){
  return "NAVIBORI|BUSINESS|" + buildBusinessDeepLink(origin,slug);
}
