/** Merchant-managed promotions API. Merchant identity and ownership are verified server-side. */
const validDate=s=>typeof s==="string"&&Number.isFinite(Date.parse(s));
export function validatePromotionInput(input) {
  if(!input||typeof input.title!=="string"||!input.title.trim()||input.title.length>140||
    !validDate(input.startsAt)||!validDate(input.endsAt)||Date.parse(input.startsAt)>=Date.parse(input.endsAt))
    throw new TypeError("Invalid promotion title or dates");
  const description=typeof input.description==="string"?input.description:"";
  if(description.length>1000) throw new TypeError("Description too long");
  return {title:input.title.trim(),description,startsAt:input.startsAt,endsAt:input.endsAt};
}
export class MerchantPromotionsClient {
  constructor({endpoint="/api/merchant/promotions",fetchImpl=globalThis.fetch}={}) {
    if(typeof endpoint!=="string"||!endpoint.startsWith("/")||endpoint.startsWith("//")||endpoint.includes("?")||endpoint.includes("#"))
      throw new TypeError("Same-origin endpoint required");
    if(typeof fetchImpl!=="function") throw new TypeError("Fetch required");
    this.endpoint=endpoint;this.fetchImpl=fetchImpl;
  }
  async request(path,{method="GET",body,signal}={}) {
    const response=await this.fetchImpl(this.endpoint+path,{
      method,credentials:"same-origin",headers:{"Content-Type":"application/json"},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal
    });
    if(!response.ok) throw new Error(`Promotion service unavailable (HTTP ${response.status})`);
    return response.status===204?null:response.json();
  }
  list({signal}={}) {return this.request("",{signal});}
  create(input,{signal}={}) {return this.request("",{method:"POST",body:validatePromotionInput(input),signal});}
  update(id,input,{signal}={}) {return this.request("/"+encodeURIComponent(this.requireId(id)),{method:"PATCH",body:validatePromotionInput(input),signal});}
  deactivate(id,{signal}={}) {return this.request("/"+encodeURIComponent(this.requireId(id))+"/deactivate",{method:"POST",signal});}
  requireId(id) {
    if(typeof id!=="string"||!/^[-_a-zA-Z0-9]{1,100}$/.test(id)) throw new TypeError("Invalid promotion ID");
    return id;
  }
}
