export function mayNotifyNearby(now:number,lastOffer:number,lastDevice:number){
  return Number.isFinite(now)&&Number.isFinite(lastOffer)&&Number.isFinite(lastDevice)&&
    now-lastOffer>=86400000&&now-lastDevice>=600000;
}
