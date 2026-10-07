import { DEMO_COMMERCE } from "./demo";

export function getCommerceBySlug(slug:string){
  return DEMO_COMMERCE.find((business)=>business.slug===slug) ?? null;
}

export function getCommerceSlugs(){
  return DEMO_COMMERCE.map((business)=>business.slug);
}
