import type {CommerceProfile} from "./types";
import {currentVerifiedPromotions} from "./verified-promotions";
export type NearbyPosition={latitude:number;longitude:number;accuracy:number;timestamp:number};
export function nearbyPromotions(businesses:CommerceProfile[],position:NearbyPosition,radius=1000,now=Date.now()) {
  if (![position.latitude,position.longitude,position.accuracy,position.timestamp,radius,now].every(Number.isFinite) ||
      Math.abs(position.latitude)>90 || Math.abs(position.longitude)>180 ||
      position.accuracy<0 || position.accuracy>250 || radius<100 || radius>5000 ||
      now-position.timestamp>120000 || position.timestamp>now+5000) return [];
  const rad=(n:number)=>n*Math.PI/180;
  return businesses.flatMap(b=>{
    const location=b.mapLocation;
    if(!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
      Math.abs(location.latitude)>90 || Math.abs(location.longitude)>180)return [];
    const a=Math.sin(rad(location.latitude-position.latitude)/2)**2+
      Math.cos(rad(position.latitude))*Math.cos(rad(location.latitude))*Math.sin(rad(location.longitude-position.longitude)/2)**2;
    const distance=6371000*2*Math.asin(Math.sqrt(Math.min(1,a)));
    if(distance+position.accuracy>radius)return [];
    return currentVerifiedPromotions(b,new Date(now)).map(p=>({
      id:p.id,title:p.title,description:p.description,businessName:b.name,
      distance:Math.round(distance),url:"/comercios/"+encodeURIComponent(b.slug)
    }));
  }).sort((a,b)=>a.distance-b.distance);
}
