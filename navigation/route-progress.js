/**
 * Route progress calculations independent of UI and GPS tracking.
 * Input route points must be ordered from origin to destination.
 * Coordinates: {lat,lng}; optional cumulative distances from provider should be preferred for road ETA.
 */
import { NavigationTracker } from "./navigation-core.js";
const valid = p => p && Number.isFinite(p.lat) && Math.abs(p.lat)<=90 && Number.isFinite(p.lng) && Math.abs(p.lng)<=180;
export function routeProgress(route, position) {
  if (!Array.isArray(route) || route.length < 2 || !route.every(valid) || !valid(position)) return null;
  const lengths = [];
  let total = 0;
  for (let i=1;i<route.length;i++) {
    const d = NavigationTracker.distanceMeters(route[i-1],route[i]);
    lengths.push(d); total+=d;
  }
  if (total===0) return {fraction:1,remainingMeters:0,travelledMeters:0,distanceFromRouteMeters:NavigationTracker.distanceMeters(position,route[0])};
  let best = {distance:Infinity,progress:0};
  const rad=Math.PI/180,scale=6371000*rad,cos=Math.cos(position.lat*rad);
  let travelled=0;
  for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i];
    const ax=(a.lng-position.lng)*cos*scale,ay=(a.lat-position.lat)*scale;
    const bx=(b.lng-position.lng)*cos*scale,by=(b.lat-position.lat)*scale;
    const dx=bx-ax,dy=by-ay,denom=dx*dx+dy*dy;
    const t=denom ? Math.max(0,Math.min(1,-(ax*dx+ay*dy)/denom)) : 0;
    const distance=Math.hypot(ax+t*dx,ay+t*dy);
    if(distance<best.distance) best={distance,progress:travelled+lengths[i-1]*t};
    travelled+=lengths[i-1];
  }
  return {fraction:Math.min(1,best.progress/total),remainingMeters:Math.max(0,total-best.progress),travelledMeters:best.progress,distanceFromRouteMeters:best.distance};
}
export function estimatedSeconds(remainingMeters, speedMps) {
  if (!Number.isFinite(remainingMeters) || remainingMeters<0 || !Number.isFinite(speedMps) || speedMps<=0) return null;
  return Math.ceil(remainingMeters/speedMps);
}
