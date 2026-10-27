import {describe,it,expect} from "vitest";
import {activateMerchantWorkspace,closeMerchantWorkspace} from "./merchant-workspace";
function storage(){const values=new Map<string,string>();return {get length(){return values.size;},getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);},key:(i:number)=>[...values.keys()][i]??null};}
describe("merchant workspace isolation",()=>{
 it("archives account A before loading B and restores only A's own drafts",()=>{
  const s=storage();activateMerchantWorkspace(s,"A",{"navibori:merchant-draft":"seed A"});s.setItem("navibori:merchant-draft","unsaved A");
  activateMerchantWorkspace(s,"B",{"navibori:merchant-draft":"seed B"});expect(s.getItem("navibori:merchant-draft")).toBe("seed B");
  closeMerchantWorkspace(s);expect(s.getItem("navibori:merchant-draft")).toBeNull();
  activateMerchantWorkspace(s,"A",{"navibori:merchant-draft":"seed A"});expect(s.getItem("navibori:merchant-draft")).toBe("unsaved A");
 });
 it("does not expose unscoped legacy drafts to a newly signed-in account",()=>{
  const s=storage();s.setItem("navibori:merchant-draft","legacy");activateMerchantWorkspace(s,"B",{"navibori:merchant-draft":"B"});
  expect(s.getItem("navibori:merchant-draft")).toBe("B");expect(s.getItem("navibori:workspace:archive:legacy")).toContain("legacy");
 });
});
