/** User-facing merchant selection flow, independent from the UI framework. */
import { CommerceClient } from "./commerce-client.js";
export class CommerceDiscovery {
  constructor({client=new CommerceClient(),mapAdapter,onState=()=>{}}={}) {
    if(!mapAdapter || typeof mapAdapter.setCommerces!=="function") throw new TypeError("Commerce map adapter required");
    this.client=client;this.map=mapAdapter;this.onState=onState;
    this.commerces=[];this.selected=null;this.controller=null;this.generation=0;
  }
  async search(position,{radiusMeters=2000}={}) {
    const generation=++this.generation;
    this.controller?.abort();
    const controller=new AbortController();this.controller=controller;
    this.onState({type:"searching"});
    try {
      const commerces=await this.client.nearby({position,radiusMeters,signal:controller.signal});
      if(generation!==this.generation) return;
      this.commerces=commerces;
      this.map.setCommerces(commerces);
      if(this.selected && !commerces.some(c=>c.id===this.selected.id)) this.selected=null;
      this.onState({type:"results",commerces,selected:this.selected});
    } catch(error) {
      if(generation!==this.generation || error?.name==="AbortError") return;
      this.onState({type:"search-error",message:error?.message||"Commerce search failed"});
    }
  }
  select(commerceId) {
    const commerce=this.commerces.find(c=>c.id===commerceId);
    if(!commerce) return null;
    this.selected=commerce;
    this.onState({type:"selected",commerce});
    return commerce;
  }
  clearSelection() {this.selected=null;this.onState({type:"selection-cleared"});}
  destroy() {this.generation++;this.controller?.abort();this.controller=null;this.commerces=[];this.selected=null;}
}
