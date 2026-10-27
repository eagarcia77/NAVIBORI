self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
function safeTarget(value){
  try{
    const target=new URL(typeof value==="string"?value:"/comercios",self.location.origin);
    return target.origin===self.location.origin&&/^\/comercios(?:\/|$)/.test(target.pathname)
      ? target.pathname+target.search+target.hash : "/comercios";
  }catch{return "/comercios";}
}
self.addEventListener("push",event=>{
  event.waitUntil((async()=>{
    let payload=null;
    try{payload=event.data?.json()??null;}catch{}
    if(payload?.kind==="test"){
      await self.registration.showNotification("NAVIBORI · Prueba de notificaciones",{
        body:"Si ves este aviso, tu celular recibió la prueba de NAVIBORI.",
        icon:"/brand/navibori-app-icon.webp",tag:"navibori-device-test",data:{url:"/comercios"}
      });
      return;
    }
    let special=null;
    // Verify the exact advertised offer; never substitute another merchant's ad.
    if(typeof payload?.id==="string"&&/^[0-9a-f-]{36}$/i.test(payload.id)){
      try{
        const response=await fetch("/api/specials/current?id="+encodeURIComponent(payload.id),{
          cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(8000)
        });
        if(response.ok)special=(await response.json()).special??null;
      }catch{}
    }
    await self.registration.showNotification(special?special.businessName+" · "+special.title:"Novedades de NAVIBORI",{
      body:special?.description||"Abre NAVIBORI para consultar las ofertas vigentes.",
      icon:"/brand/navibori-app-icon.webp",badge:"/brand/navibori-app-icon.webp",
      tag:special?.id?"navibori-special-"+special.id:"navibori-special",
      data:{url:safeTarget(special?.url??payload?.url)},
      actions:[{action:"open",title:"Ver ofertas"}]
    });
  })());
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=safeTarget(event.notification?.data?.url);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if("focus" in client){
        try{await client.navigate(target);return client.focus();}catch{}
      }
    }
    return self.clients.openWindow(target);
  })());
});
