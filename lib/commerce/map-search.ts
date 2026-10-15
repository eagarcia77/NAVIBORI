import type {CommerceProfile} from "./types";

export function normalizeCommerceSearch(value:string){
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .trim();
}

export function commerceMatchesSearch(
  business:CommerceProfile,
  query:string
){
  const normalized=normalizeCommerceSearch(query);
  if(!normalized) return true;

  const haystack=normalizeCommerceSearch([
    business.name,
    business.category,
    business.locationLabel,
    business.mapLocation?.address ?? ""
  ].join(" "));

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every((token)=>haystack.includes(token));
}
