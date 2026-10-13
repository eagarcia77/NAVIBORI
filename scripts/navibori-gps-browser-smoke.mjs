import {chromium} from "playwright";

// Real browser geolocation API with synthetic coordinates. This proves that
// UI wiring reacts to permission responses; it does NOT establish real GPS
// reception on an iPhone or authorize on-road use.
const host="http://127.0.0.1:3200";
const browser=await chromium.launch({
  headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]
});
const failures=[];
try{
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
    console.log("Mobile geolocation allowed:",status.replaceAll("\n"," "));
  }catch{
    failures.push("Allowed GPS did not reach received: "+
      await successPage.locator(".map-panel").getAttribute("data-gps-probe"));
  }
  await successPage.screenshot({path:"/tmp/navibori-gps-allowed.png"});
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
    console.log("Mobile geolocation denied:",status.replaceAll("\n"," "));
  }catch{
    failures.push("Denied GPS did not show permissions error: "+
      await deniedPage.locator(".map-panel").getAttribute("data-gps-probe"));
  }
  await deniedPage.screenshot({path:"/tmp/navibori-gps-denied.png"});
  await denied.close();
}finally{
  await browser.close();
}
if(failures.length){
  console.error(failures.join("\n"));
  process.exitCode=1;
}
