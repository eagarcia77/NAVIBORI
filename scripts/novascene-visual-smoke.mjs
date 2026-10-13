import {chromium} from "playwright";

const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
const errors=[];
try{
  const viewportModes=[
    {label:"desktop",viewport:{width:1280,height:850},deviceScaleFactor:1},
    {label:"mobile",viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}
  ];
  for(const config of viewportModes){
    const context=await browser.newContext({
      viewport:config.viewport,deviceScaleFactor:config.deviceScaleFactor,
      isMobile:config.isMobile??false,hasTouch:config.hasTouch??false,
      locale:"es-PR"
    });
    const page=await context.newPage();
    page.on("pageerror",error=>errors.push(config.label+": "+error.message));
    page.on("console",message=>{
      if(message.type()==="error")console.log(config.label+" console error:",message.text().slice(0,250));
    });
    await page.goto("http://127.0.0.1:3200/?novasceneQA=1",{
      waitUntil:"domcontentloaded",timeout:45000
    });
    await page.waitForSelector(".map-panel[data-novascene-total]",{timeout:45000});
    // Startup business overview can zoom below extrusion threshold. Verify
    // the actual neighborhood at street zoom (as GPS navigation shows it).
    await page.waitForFunction(()=>
      typeof window.__novaQA?.focus==="function",undefined,{timeout:10000});
    await page.evaluate(()=>window.__novaQA.focus());
    let result;
    try{
      await page.waitForFunction(()=>{
        const element=document.querySelector(".map-panel[data-novascene-total]");
        return Number(element?.getAttribute("data-novascene-visible")??0)>0;
      },undefined,{timeout:45000});
      result="visible";
    }catch{
      result="not-visible";
    }
    const diagnostics=await page.locator(".map-panel").evaluate(el=>({
      state:el.getAttribute("data-novascene-state"),
      visible:el.getAttribute("data-novascene-visible"),
      total:el.getAttribute("data-novascene-total")
    }));
    await page.screenshot({path:"/tmp/novascene-"+config.label+".png",fullPage:false});
    const renderer=await page.evaluate(()=>window.__novaQA?.inspect?.());
    console.log("NovaScene "+config.label+" WebGL "+result+":",
      JSON.stringify(diagnostics),"renderer:",JSON.stringify(renderer));
    if(result!=="visible")errors.push(
      "No extruded 3D feature in "+config.label+" viewport: "+JSON.stringify(diagnostics)
    );
    await context.close();
  }
}finally{
  await browser.close();
}
if(errors.length){
  console.error(errors.join("\n"));
  process.exitCode=1;
}
