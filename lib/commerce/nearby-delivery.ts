/** Recheck foreground consent and current offers after asynchronous worker startup. */
export async function deliverNearbyOffer<T>(options:{
  ready:()=>Promise<unknown>;
  allowed:()=>boolean;
  offers:()=>T[];
  eligible:(offer:T)=>boolean;
  show:(offer:T)=>Promise<void>;
  record:(offer:T)=>void;
}){
  await options.ready();
  if(!options.allowed())return;
  const offer=options.offers().find(options.eligible);
  if(!offer)return;
  await options.show(offer);
  options.record(offer);
}
