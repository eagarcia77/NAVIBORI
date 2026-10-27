import type {CommerceProfile} from "./types";
import {currentVerifiedPromotions} from "./verified-promotions";
/** The map's two-offer display limit must not hide an explicitly requested advertisement. */
export function publishedSpecials(businesses:CommerceProfile[],id:string|null=null,now=new Date()){
  return businesses.flatMap(business=>{
    const selected=id?{...business,promotions:business.promotions.filter(p=>p.id===id)}:business;
    return currentVerifiedPromotions(selected,now).map(promotion=>({
      id:promotion.id,title:promotion.title,description:promotion.description,startsAt:promotion.startsAt??null,
      businessName:business.name,url:"/comercios/"+encodeURIComponent(business.slug)
    }));
  }).sort((a,b)=>(b.startsAt?Date.parse(b.startsAt):0)-(a.startsAt?Date.parse(a.startsAt):0));
}
