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
    await page.goto("http://127.0.0.1:3200",{
      waitUntil:"domcontentloaded",timeout:45000
    });
    await page.waitForSelector(".map-panel[data-novascene-total]",{timeout:45000});
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
    console.log("NovaScene "+config.label+" WebGL "+result+":",JSON.stringify(diagnostics));
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
