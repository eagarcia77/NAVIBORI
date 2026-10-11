/** Commerce discovery client; location is sent only on explicit search. */
const valid = p=>p && Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
export function normalizeCommerce(item) {
  if(!item || typeof item.id!=="string" || !item.id.trim() || typeof item.name!=="string" || !item.name.trim() || !valid(item.location))
    throw new TypeError("Invalid commerce");
  return {id:item.id,name:item.name,location:{lat:item.location.lat,lng:item.location.lng},
    category:typeof item.category==="string"?item.category:"",
    description:typeof item.description==="string"?item.description:"",
    offer:typeof item.offer==="string"?item.offer:null};
}
export class CommerceClient {
  constructor({endpoint="/api/commerces/nearby",fetchImpl=globalThis.fetch}={}) {
    if(typeof endpoint!=="string"||!endpoint.startsWith("/")||endpoint.startsWith("//")||endpoint.includes("?")||endpoint.includes("#"))
      throw new TypeError("Same-origin path required");
    if(typeof fetchImpl!=="function") throw new TypeError("fetch required");
    this.endpoint=endpoint;this.fetchImpl=fetchImpl;
  }
  async nearby({position,radiusMeters=2000,signal}={}) {
    if(!valid(position)||!Number.isInteger(radiusMeters)||radiusMeters<100||radiusMeters>20000)
      throw new TypeError("Invalid nearby search");
    const params=new URLSearchParams({lat:String(position.lat),lng:String(position.lng),radius:String(radiusMeters)});
    const response=await this.fetchImpl(`${this.endpoint}?${params}`,{method:"GET",credentials:"same-origin",signal});
    if(!response.ok) throw new Error(`Commerce service unavailable (HTTP ${response.status})`);
    const data=await response.json();
    if(!data||!Array.isArray(data.commerces)||data.commerces.length>500) throw new TypeError("Invalid commerce response");
    return data.commerces.map(normalizeCommerce);
  }
}
