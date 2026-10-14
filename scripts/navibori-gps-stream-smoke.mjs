import {chromium,webkit} from "playwright";

const host="http://127.0.0.1:3200";
const engines=[
  {name:"chromium",browser:await chromium.launch({
    headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]
  })},
  {name:"webkit",browser:await webkit.launch({headless:true})}
];
const failures=[];
const base={latitude:18.052,longitude:-66.506,accuracy:8};
try{
  for(const {name,browser} of engines){
    const context=await browser.newContext({
      viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      locale:"es-PR",geolocation:base
    });
    await context.grantPermissions(["geolocation"],{origin:host});
    const page=await context.newPage();
    let phase="startup";
    let reportedErrors=0;
    page.on("pageerror",err=>{
      const detail=name+" phase="+phase+": "+(err.stack||err.message);
      failures.push(detail);
      console.error("GPS stream page error #"+(++reportedErrors)+": "+detail);
    });
    let routeCount=0;
    await page.route("**/api/routing",async route=>{
      routeCount++;
      const request=route.request().postDataJSON();
      const start=request.origin;
      const end=request.destination;
      await route.fulfill({
        status:200,contentType:"application/json",
        body:JSON.stringify({
          mode:request.mode||"driving",
          distanceMeters:4000,durationSeconds:500,
          provider:"Valhalla / OpenStreetMap",
          geometry:{type:"LineString",coordinates:[
            [start.longitude,start.latitude],
            [start.longitude+0.001,start.latitude+0.001],
            [end.longitude,end.latitude]
          ]},
          steps:[{
            instruction:"Sigue la ruta",type:"depart",modifier:null,
            name:"Calle",distanceMeters:3800,durationSeconds:460,
            location:start,exit:null
          },{
            instruction:"Llegaste",type:"arrive",modifier:null,name:"",
            distanceMeters:200,durationSeconds:40,location:end,exit:null
          }]
        })
      });
    });
    try{
      phase="loading app";
      await page.goto(host,{waitUntil:"domcontentloaded",timeout:45000});
      // UX 3.0 must expose actual search without opening the sidebar.
      const searchBox=page.getByRole("searchbox",{
        name:"Buscar comercio, categoría o dirección"
      });
      await searchBox.waitFor({timeout:20000});
      await searchBox.fill("navibori-nonexistent-business-qa");
      // The GPS stream smoke checks search input interaction, not the
      // asynchronous search-result panel. WebKit may defer that panel's
      // visibility when focus and geolocation permissions change.
      if(await searchBox.inputValue()!=="navibori-nonexistent-business-qa"){
        failures.push(name+": search field did not accept text");
      }
      await searchBox.fill("");
      await searchBox.press("Escape");
      await context.setGeolocation({...base});
      phase="requesting first geolocation";
      await page.getByRole("button",{name:"Obtener mi ubicación real"}).click();
      await page.waitForSelector('.map-panel[data-gps-probe="received"]',{timeout:25000});
      const nearbyToggle=page.locator(".navibori-nearby-toggle");
      await nearbyToggle.waitFor({timeout:20000});
      if(await page.locator(".nearby-businesses-panel").count()){
        failures.push(name+": nearby list must be collapsed until requested");
      }
      await nearbyToggle.click();
      await page.locator(".nearby-business-main").first().waitFor({timeout:15000});
      await page.locator(".nearby-business-main").first().click();
      // A DEMO location is not a verified, copyable postal address.
      if((await page.locator(".commerce-demo-badge").innerText())==="DEMO" &&
        await page.locator(".business-route-address-row button").count()){
        failures.push(name+": DEMO must not offer Copy address");
      }
      // Apple Maps must be directly visible, never buried in More options.
      const handoff=page.locator(".navibori-apple-maps-link");
      await handoff.waitFor({timeout:10000});
      if(!await handoff.isVisible()){
        failures.push(name+": Apple Maps access is hidden in the commerce preview");
      }
      const appleHref=await handoff.getAttribute("href");
      const appleMode=await handoff.getAttribute("data-external-directions");
      if((await page.locator(".commerce-demo-badge").innerText())==="DEMO"){
        if(appleMode!=="without-destination"||!appleHref?.startsWith("https://maps.apple.com/")||
          appleHref?.includes("destination=")||appleHref?.includes("daddr=")){
          failures.push(name+": DEMO Apple Maps link must not send fictional destination coordinates");
        }
      }
      if(await page.locator(".navibori-gps-probe button").count()){
        failures.push(name+": one-shot GPS probe must not bypass route preview");
      }
      if(await page.locator(".nearby-businesses-panel").count()){
        failures.push(name+": nearby list must close after selecting a business");
      }
      phase="previewing the selected travel mode";
      await page.getByRole("button",{name:"Cómo llegar",exact:true}).click();
      await page.locator(".business-route-mode-actions button").first().click();
      await page.getByRole("button",{name:"Ver ruta",exact:true}).click();
      const startNavigation=page.getByRole("button",{
        name:"Iniciar navegación",exact:true
      });
      await startNavigation.waitFor({timeout:30000});
      if(await page.locator(".map-panel").getAttribute("data-navigation-active")!=="false"){
        failures.push(name+": preview must not start live GPS before user confirmation");
      }
      phase="starting continuous navigation";
      await startNavigation.click();
      await page.waitForFunction(()=>{
        const map=document.querySelector(".map-panel");
        return map?.getAttribute("data-navigation-active")==="true" &&
          Number(map?.getAttribute("data-gps-stream-fixes")||0)>=1;
      },undefined,{timeout:30000});
      const essentialBar=page.locator(".navibori-drive-summary");
      if(!await essentialBar.isVisible()){
        failures.push(name+": navigation has no visible ETA/distance/voice controls");
      }else{
        const text=await essentialBar.innerText();
        if(!text.includes("Llegada")||!text.includes("Restante")){
          failures.push(name+": missing essential navigation data: "+text);
        }
        if(!await essentialBar.getByRole("button",{name:"Recentrar en mi ubicación"}).isVisible()){
          failures.push(name+": GPS recenter action missing");
        }
        if(!await essentialBar.getByRole("button",{name:/(Silenciar instrucciones|Activar instrucciones de voz)/i}).isVisible()){
          failures.push(name+": accessible voice toggle missing");
        }
      }
      if(await page.locator(".navibori-3d-navigation-status").count()){
        failures.push(name+": developer 3D telemetry should not obscure GPS navigation");
      }
      if(await page.locator(".navibori-photon-cursor,.navibori-orbital-target,.navibori-trajectory-ghost").count()){
        failures.push(name+": decorative GPS/trajectory map markers should not cover road directions");
      }
      if(await page.locator(".vector-gate-phase,.vector-gate-distance").count()){
        failures.push(name+": duplicate turn labels should be removed from the map marker");
      }
      if(await page.locator(".navibori-drive-summary").isVisible()){
        const units=await page.locator(".map-panel").getAttribute("data-distance-units");
        if(units!=="imperial"){
          failures.push(name+": Puerto Rico automatic distance unit must be imperial, got "+units);
        }
        if(!(await page.locator(".navibori-drive-summary").innerText()).includes("mi")){
          failures.push(name+": remaining distance must match maneuver units in miles/feet");
        }
      }
      phase="GPS watch active";
      const initial=Number(await page.locator(".map-panel").getAttribute("data-gps-stream-fixes"));
      await new Promise(resolve=>setTimeout(resolve,1450));
      phase="moving while following camera";
      await context.setGeolocation({
        latitude:18.05213,longitude:-66.50583,accuracy:8
      });
      await page.waitForFunction(prev=>
        Number(document.querySelector(".map-panel")?.getAttribute("data-gps-stream-fixes")||0)>prev,
        initial,{timeout:14000});
      const afterMove=Number(await page.locator(".map-panel").getAttribute("data-gps-stream-fixes"));
      await new Promise(resolve=>setTimeout(resolve,1450));
      phase="rejecting isolated coordinate jump";
      await context.setGeolocation({
        latitude:18.067,longitude:-66.506,accuracy:8
      });
      await page.waitForSelector('.map-panel[data-gps-unconfirmed-jump="true"]',{timeout:14000});
      const afterJump=Number(await page.locator(".map-panel").getAttribute("data-gps-stream-fixes"));
      if(afterJump!==afterMove)
        failures.push(name+": isolated GPS teleport advanced user progress: "+afterMove+" -> "+afterJump);
      console.log(name+" live watch stream:",JSON.stringify({
        first:initial,moved:afterMove,rejectedJump:afterJump,routeRequests:routeCount
      }));
      phase="capturing results";
      await page.screenshot({path:"/tmp/navibori-gps-stream-"+name+".png"});
      phase="confirming a deliberate GPS stop";
      await page.getByRole("button",{name:"Finalizar navegación GPS"}).click();
      const stopDialog=page.getByRole("alertdialog",{name:"¿Finalizar navegación?"});
      await stopDialog.waitFor({timeout:8000});
      if(await page.locator(".map-panel").getAttribute("data-navigation-active")!=="true"){
        failures.push(name+": End button stopped GPS before confirmation");
      }
      await stopDialog.getByRole("button",{name:"Continuar navegando"}).click();
      if(await page.locator(".map-panel").getAttribute("data-navigation-active")!=="true"){
        failures.push(name+": continuing navigation should preserve GPS stream");
      }
      await page.getByRole("button",{name:"Finalizar navegación GPS"}).click();
      await page.getByRole("alertdialog").getByRole("button",{
        name:"Finalizar navegación",exact:true
      }).click();
      await page.waitForSelector('.map-panel[data-navigation-active="false"]',{timeout:10000});
      if(!await page.locator(".business-route-card").isVisible()){
        failures.push(name+": ending GPS should preserve the route preview card");
      }

    }catch(err){
      const panel=await page.locator(".map-panel").evaluate(el=>({
        gpsFixes:el.getAttribute("data-gps-stream-fixes"),
        active:el.getAttribute("data-navigation-active"),
        jump:el.getAttribute("data-gps-unconfirmed-jump")
      })).catch(()=>null);
      const text=await page.locator(".business-route-card").innerText().catch(()=>"not present");
      failures.push(name+" continuous watch test: "+String(err)+
        " panel="+JSON.stringify(panel)+" card="+text.slice(0,800));
      await page.screenshot({path:"/tmp/navibori-gps-stream-"+name+"-error.png"}).catch(()=>{});
    }
    phase="closing browser context";
    await context.close();
  }
}finally{
  await Promise.all(engines.map(({browser})=>browser.close()));
}
if(failures.length){console.error(failures.join("\n"));process.exitCode=1;}
