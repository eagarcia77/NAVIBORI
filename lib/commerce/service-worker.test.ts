import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
function worker(){
 const handlers:Record<string,(event:any)=>void>={};
 const showNotification=vi.fn(async(_title:string,_options?:unknown)=>{});const fetch=vi.fn();const openWindow=vi.fn(async()=>{});
 runInNewContext(readFileSync("public/sw.js","utf8"),{
  self:{location:{origin:"https://navibori.onrender.com"},addEventListener:(type:string,callback:any)=>{handlers[type]=callback;},
   registration:{showNotification},clients:{matchAll:async()=>[],openWindow}},fetch,URL,AbortSignal
 });
 async function push(payload:unknown){let task:Promise<unknown>|undefined;handlers.push({data:payload?{json:()=>payload}:null,waitUntil:(p:Promise<unknown>)=>{task=p;}});await task;}
 return {handlers,showNotification,fetch,openWindow,push};
}
describe("phone notification worker",()=>{
 it("verifies the precise advertised promotion and does not show another business",async()=>{
  const w=worker();const id="12345678-1234-1234-1234-123456789012";
  w.fetch.mockResolvedValue({ok:true,json:async()=>({special:{id,businessName:"Tienda A",title:"Oferta A",description:"Actual",url:"/comercios/a"}})});
  await w.push({id,url:"/comercios/a"});
  expect(w.fetch.mock.calls[0][0]).toContain("?id="+id);expect(w.showNotification.mock.calls[0][0]).toBe("Tienda A · Oferta A");
 });
 it("shows a generic notice for paused or legacy empty pushes",async()=>{
  const w=worker();w.fetch.mockResolvedValue({ok:true,json:async()=>({special:null})});
  await w.push({id:"12345678-1234-1234-1234-123456789012"});expect(w.showNotification.mock.calls[0][0]).toBe("Novedades de NAVIBORI");
  w.fetch.mockClear();await w.push(null);expect(w.fetch).not.toHaveBeenCalled();
 });
 it("cannot open an external page from a notification",async()=>{
  const w=worker();let task:Promise<unknown>|undefined;
  w.handlers.notificationclick({notification:{close:()=>{},data:{url:"https://evil.test"}},waitUntil:(p:Promise<unknown>)=>{task=p;}});await task;
  expect(w.openWindow).toHaveBeenCalledWith("/comercios");
 });
});
