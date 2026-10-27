/** Limit outbound delivery to known browser push services, never arbitrary HTTPS URLs. */
export function allowedPushEndpoint(endpoint:string):boolean{
  try{
    const u=new URL(endpoint);
    if(u.protocol!=="https:"||u.username||u.password||u.port||u.hash||endpoint.length>2048)return false;
    return (u.hostname==="fcm.googleapis.com"&&/^\/(fcm\/send|wp)\//.test(u.pathname))||
      (u.hostname==="updates.push.services.mozilla.com"&&u.pathname.startsWith("/wpush/"))||
      (u.hostname==="web.push.apple.com"&&u.pathname.length>1)||
      (u.hostname.endsWith(".notify.windows.com")&&u.pathname.startsWith("/w/"));
  }catch{return false;}
}
export function safePromotionPath(value:unknown):string{
  if(typeof value!=="string"||!value.startsWith("/comercios/")||value.startsWith("//"))return "/comercios";
  try{const u=new URL(value,"https://navibori.onrender.com");return u.origin==="https://navibori.onrender.com"&&/^\/comercios(?:\/|$)/.test(u.pathname)?u.pathname+u.search:"/comercios";}catch{return "/comercios";}
}
export function notificationPayload(business:{name:string;slug:string},promotion:{id:string;title:string;description?:string|null;ends_at?:string|null}){
  const path=safePromotionPath("/comercios/"+encodeURIComponent(business.slug));
  const payload={id:promotion.id,businessName:business.name.slice(0,120),title:promotion.title.slice(0,120),
    description:(promotion.description??"").slice(0,1000),url:path.length<=512?path:"/comercios",
    endsAt:promotion.ends_at??null};
  const points=Array.from(payload.description);
  while(new TextEncoder().encode(JSON.stringify(payload)).byteLength>3000&&points.length){
    points.splice(Math.max(0,points.length-128));payload.description=points.join("");
  }
  return payload;
}
