/** Provider-agnostic directions API client with mode validation and abort support. */
const MODES = Object.freeze(["driving","walking","cycling","scooter"]);
const valid = p => p && Number.isFinite(p.lat) && Math.abs(p.lat)<=90 && Number.isFinite(p.lng) && Math.abs(p.lng)<=180;
export function validateMode(mode) {
  if (!MODES.includes(mode)) throw new RangeError("Unsupported travel mode");
  return mode;
}
export function normalizeDirections(payload) {
  if (!payload || !Array.isArray(payload.coordinates) || payload.coordinates.length<2 ||
      !payload.coordinates.every(valid)) throw new TypeError("Routing service returned invalid geometry");
  const distanceMeters=payload.distanceMeters;
  const durationSeconds=payload.durationSeconds;
  if (!Number.isFinite(distanceMeters) || distanceMeters<0 || !Number.isFinite(durationSeconds) || durationSeconds<0)
    throw new TypeError("Routing service returned invalid distance or duration");
  return {coordinates:payload.coordinates.map(({lat,lng})=>({lat,lng})),distanceMeters,durationSeconds,
    steps:Array.isArray(payload.steps)?payload.steps:[]};
}
export class DirectionsClient {
  constructor({endpoint="/api/directions",fetchImpl=globalThis.fetch}={}) {
    if(typeof endpoint!=="string" || !endpoint.startsWith("/") || endpoint.startsWith("//"))
      throw new TypeError("Routing endpoint must be a same-origin path");
    if(typeof fetchImpl!=="function") throw new TypeError("fetch implementation required");
    this.endpoint=endpoint;
    this.fetchImpl=fetchImpl;
  }
  async route({origin,destination,mode="driving",signal}={}) {
    if(!valid(origin)||!valid(destination)) throw new TypeError("Valid origin and destination required");
    validateMode(mode);
    const response=await this.fetchImpl(this.endpoint,{
      method:"POST",headers:{"Content-Type":"application/json"},
      credentials:"same-origin",signal,
      body:JSON.stringify({origin:{lat:origin.lat,lng:origin.lng},destination:{lat:destination.lat,lng:destination.lng},mode})
    });
    if(!response.ok) throw new Error(`Routing unavailable (HTTP ${response.status})`);
    return normalizeDirections(await response.json());
  }
}
