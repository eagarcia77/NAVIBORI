/**
 * NAVIBORI map adapter for MapLibre GL JS.
 * This module expects a MapLibre map instance and a routing-provider polyline.
 * It does not fetch directions or initiate geolocation.
 */
const valid = p => p && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180;
const SOURCE = "navibori-navigation-route";
const LAYER = "navibori-navigation-route-line";
export class NavigationMapAdapter {
  constructor(map) {
    if (!map || typeof map.addSource !== "function" || typeof map.addLayer !== "function") throw new TypeError("A MapLibre map instance is required");
    this.map = map;
    this.route = [];
    this.follow = true;
    this.marker = null;
    this.destroyed = false;
  }
  setRoute(points) {
    if (!Array.isArray(points) || !points.every(valid)) throw new TypeError("Invalid route geometry");
    this.route = points.map(p=>({lat:p.lat,lng:p.lng}));
    this.renderRoute();
  }
  renderRoute() {
    if (this.destroyed || !this.map.isStyleLoaded?.()) return;
    const geojson = {type:"Feature",properties:{},geometry:{type:"LineString",coordinates:this.route.map(p=>[p.lng,p.lat])}};
    if (this.map.getSource(SOURCE)) this.map.getSource(SOURCE).setData(geojson);
    else this.map.addSource(SOURCE,{type:"geojson",data:geojson});
    if (!this.map.getLayer(LAYER)) this.map.addLayer({id:LAYER,type:"line",source:SOURCE,layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":"#2563eb","line-width":7,"line-opacity":0.92}});
  }
  updatePosition(point) {
    if (this.destroyed || !valid(point)) return;
    if (this.follow && typeof this.map.easeTo === "function") {
      const camera={center:[point.lng,point.lat],duration:450,essential:true};
      if (Number.isFinite(point.headingDegrees) && point.headingDegrees >= 0) camera.bearing=point.headingDegrees;
      this.map.easeTo(camera);
    }
  }
  setFollow(enabled) { this.follow=Boolean(enabled); }
  destroy() {
    if (this.destroyed) return;
    this.destroyed=true;
    if (this.map.getLayer?.(LAYER)) this.map.removeLayer(LAYER);
    if (this.map.getSource?.(SOURCE)) this.map.removeSource(SOURCE);
    this.route=[];
  }
}
