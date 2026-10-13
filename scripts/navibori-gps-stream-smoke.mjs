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
      await context.setGeolocation({...base});
      phase="requesting first geolocation";
      await page.getByRole("button",{name:"Obtener mi ubicación real"}).click();
      await page.waitForSelector('.map-panel[data-gps-probe="received"]',{timeout:25000});
      await page.locator(".nearby-business-main").first().waitFor({timeout:20000});
      await page.locator(".nearby-business-main").first().click();
      phase="starting continuous navigation";
      await page.locator(".business-route-mode-actions button").first().click();
      await page.waitForFunction(()=>{
        const map=document.querySelector(".map-panel");
        return map?.getAttribute("data-navigation-active")==="true" &&
          Number(map?.getAttribute("data-gps-stream-fixes")||0)>=1;
      },undefined,{timeout:30000});
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
