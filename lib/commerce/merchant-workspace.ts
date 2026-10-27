type BrowserStorage=Pick<Storage,"getItem"|"setItem"|"removeItem"|"key"|"length">;
const ACTIVE="navibori:workspace:active";
function merchantKeys(storage:BrowserStorage){
  return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((k):k is string=>!!k&&k.startsWith("navibori:merchant-"));
}
/** Legacy editor keys are scoped before children mount; prior accounts' drafts are archived, never reused. */
export function activateMerchantWorkspace(storage:BrowserStorage,scope:string,seed:Record<string,string>){
  const previous=storage.getItem(ACTIVE);
  if(previous!==scope){
    const snapshot=Object.fromEntries(merchantKeys(storage).map(k=>[k,storage.getItem(k)]));
    if(Object.keys(snapshot).length)storage.setItem("navibori:workspace:archive:"+(previous??"legacy"),JSON.stringify(snapshot));
    const raw=storage.getItem("navibori:workspace:archive:"+scope);
    let restored:Record<string,unknown>={};
    try{restored=raw?JSON.parse(raw):{};}catch{}
    for(const key of merchantKeys(storage))storage.removeItem(key);
    if(restored&&typeof restored==="object")for(const [key,value] of Object.entries(restored)){
      if(key.startsWith("navibori:merchant-")&&typeof value==="string")storage.setItem(key,value);
    }
    storage.setItem(ACTIVE,scope);
  }
  for(const [key,value] of Object.entries(seed))if(storage.getItem(key)===null)storage.setItem(key,value);
}
export function closeMerchantWorkspace(storage:BrowserStorage){
  const previous=storage.getItem(ACTIVE);
  if(previous){
    const snapshot=Object.fromEntries(merchantKeys(storage).map(k=>[k,storage.getItem(k)]));
    storage.setItem("navibori:workspace:archive:"+previous,JSON.stringify(snapshot));
  }
  for(const key of merchantKeys(storage))storage.removeItem(key);
  storage.removeItem(ACTIVE);
}
