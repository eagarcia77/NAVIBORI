/** Commerce pins for MapLibre GL JS. No network access or fabricated merchants. */
const SOURCE="navibori-commerce-pins", LAYER="navibori-commerce-circles";
const valid=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
export class CommerceMapAdapter {
  constructor(map,{onSelect=()=>{}}={}) {
    if(!map||typeof map.addSource!=="function"||typeof map.on!=="function") throw new TypeError("MapLibre map required");
    this.map=map;this.onSelect=onSelect;this.commerces=[];this.destroyed=false;
    this.handleClick=event=>{
      const id=event?.features?.[0]?.properties?.commerceId;
      const commerce=this.commerces.find(c=>c.id===id);
      if(commerce) this.onSelect(commerce);
    };
    this.map.on("click",LAYER,this.handleClick);
  }
  setCommerces(commerces) {
    if(!Array.isArray(commerces)||commerces.length>500||!commerces.every(c=>c&&typeof c.id==="string"&&typeof c.name==="string"&&valid(c.location)))
      throw new TypeError("Invalid commerce list");
    this.commerces=commerces.slice();this.render();
  }
  render() {
    if(this.destroyed||!this.map.isStyleLoaded?.()) return;
    const data={type:"FeatureCollection",features:this.commerces.map(c=>({
      type:"Feature",properties:{commerceId:c.id,name:c.name,category:c.category||""},
      geometry:{type:"Point",coordinates:[c.location.lng,c.location.lat]}
    }))};
    const source=this.map.getSource(SOURCE);
    if(source) source.setData(data);
    else this.map.addSource(SOURCE,{type:"geojson",data});
    if(!this.map.getLayer(LAYER)) this.map.addLayer({
      id:LAYER,type:"circle",source:SOURCE,
      paint:{"circle-radius":9,"circle-color":"#0f766e","circle-stroke-color":"#ffffff","circle-stroke-width":3}
    });
  }
  destroy() {
    if(this.destroyed) return;
    this.destroyed=true;
    this.map.off?.("click",LAYER,this.handleClick);
    if(this.map.getLayer?.(LAYER)) this.map.removeLayer(LAYER);
    if(this.map.getSource?.(SOURCE)) this.map.removeSource(SOURCE);
    this.commerces=[];
  }
}
