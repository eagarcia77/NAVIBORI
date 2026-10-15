self.addEventListener("push",(event)=>{
  event.waitUntil((async()=>{
    let special=null;

    try{
      const response=await fetch("/api/specials/current",{
        cache:"no-store",
        credentials:"same-origin"
      });
      if(response.ok){
        const data=await response.json();
        special=data.special ?? null;
      }
    }catch{}

    const title=special
      ? special.businessName+" · "+special.title
      : "Nuevo especial en NAVIBORI";
    const body=special?.description
      ? special.description
      : "Abre NAVIBORI para ver los especiales disponibles ahora.";
    const url=special?.url ?? "/comercios";

    await self.registration.showNotification(title,{
      body,
      icon:"/brand/navibori-app-icon.webp",
      badge:"/brand/navibori-app-icon.webp",
      tag:special?.id ? "navibori-special-"+special.id : "navibori-special",
      renotify:true,
      data:{url},
      actions:[
        {action:"open",title:"Ver especial"}
      ]
    });
  })());
});

self.addEventListener("notificationclick",(event)=>{
  event.notification.close();
  const target=event.notification?.data?.url || "/comercios";

  event.waitUntil((async()=>{
    const clientsList=await clients.matchAll({
      type:"window",
      includeUncontrolled:true
    });

    for(const client of clientsList){
      if("focus" in client){
        try{
          await client.navigate(target);
        }catch{}
        return client.focus();
      }
    }

    return clients.openWindow(target);
  })());
});
