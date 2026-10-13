import {chromium,webkit} from "playwright";

// Real browser geolocation API with synthetic coordinates. This proves that
// UI wiring reacts to permission responses; it does NOT establish real GPS
// reception on an iPhone or authorize on-road use.
const host="http://127.0.0.1:3200";
const launches=[
  {name:"chromium",browser:await chromium.launch({
    headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]
  })},
  {name:"webkit",browser:await webkit.launch({headless:true})}
];
const failures=[];
try{
  for(const {name,browser} of launches){
  const location={latitude:18.052,longitude:-66.506,accuracy:9};
  const approved=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    locale:"es-PR",geolocation:location
  });
  await approved.grantPermissions(["geolocation"],{origin:host});
  const successPage=await approved.newPage();
  successPage.on("pageerror",error=>failures.push("Allowed GPS: "+error.message));
  await successPage.goto(host,{waitUntil:"domcontentloaded",timeout:45000});
  await successPage.getByRole("button",{name:"Obtener mi ubicación real"}).click();
  try{
    await successPage.waitForSelector('.map-panel[data-gps-probe="received"]',{timeout:20000});
    const status=await successPage.locator(".navibori-gps-probe").innerText();
    if(!status.includes("±9 m")||!status.includes("Ubicación recibida")){
      failures.push("Allowed GPS status missing location/accuracy: "+status);
    }
    console.log(name+" mobile geolocation allowed:",status.replaceAll("\n"," "));
  }catch{
    const state=await successPage.locator(".map-panel").getAttribute("data-gps-probe");
    const overlay=await successPage.locator(".navibori-gps-probe").innerText().catch(()=>"(no overlay)");
    const details=await successPage.locator(".business-route-card").innerText().catch(()=>"(no details)");
    const browserFacts=await successPage.evaluate(()=>({
      secure:window.isSecureContext,
      geolocation:!!navigator.geolocation,
      userAgent:navigator.userAgent
    }));
    failures.push(name+" allowed GPS did not reach received: "+state+
      " overlay="+overlay.replaceAll("\n"," ")+
      " details="+details.slice(-500).replaceAll("\n"," ")+
      " browser="+JSON.stringify(browserFacts));
  }
  await successPage.screenshot({path:"/tmp/navibori-gps-"+name+"-allowed.png"});
  await approved.close();

  const denied=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:"es-PR"
  });
  await denied.grantPermissions([],{origin:host});
  const deniedPage=await denied.newPage();
  deniedPage.on("pageerror",error=>failures.push("Denied GPS: "+error.message));
  await deniedPage.goto(host,{waitUntil:"domcontentloaded",timeout:45000});
  await deniedPage.getByRole("button",{name:"Obtener mi ubicación real"}).click();
  try{
    await deniedPage.waitForSelector('.map-panel[data-gps-probe="denied"]',{timeout:20000});
    const status=await deniedPage.locator(".navibori-gps-probe").innerText();
    if(!status.includes("Permiso de ubicación denegado"))
      failures.push("Denied GPS displayed incorrect state: "+status);
    console.log(name+" mobile geolocation denied:",status.replaceAll("\n"," "));
  }catch{
    failures.push("Denied GPS did not show permissions error: "+
      await deniedPage.locator(".map-panel").getAttribute("data-gps-probe"));
  }
  await deniedPage.screenshot({path:"/tmp/navibori-gps-"+name+"-denied.png"});
  await denied.close();
  }
}finally{
  await Promise.all(launches.map(async ({browser})=>browser.close()));
}
if(failures.length){
  console.error(failures.join("\n"));
  process.exitCode=1;
}
