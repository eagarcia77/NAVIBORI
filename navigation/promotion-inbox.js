/** Accessible in-app promotion inbox; does not request OS notification permission. */
export class PromotionInbox {
  constructor({onChange=()=>{},maxItems=30}={}) {
    if(!Number.isInteger(maxItems)||maxItems<1||maxItems>100) throw new RangeError("Invalid inbox capacity");
    this.onChange=onChange;this.maxItems=maxItems;this.items=[];this.dismissed=new Set();
  }
  receive(offer) {
    if(!offer||typeof offer.merchantId!=="string"||typeof offer.offerId!=="string"||
      typeof offer.title!=="string"||!offer.title.trim()) return false;
    const id=offer.merchantId+":"+offer.offerId;
    if(this.dismissed.has(id)||this.items.some(item=>item.id===id)) return false;
    this.items.unshift({id,merchantId:offer.merchantId,offerId:offer.offerId,
      merchantName:String(offer.merchantName||""),title:offer.title,
      expiresAt:offer.expiresAt||null,read:false});
    if(this.items.length>this.maxItems)this.items.length=this.maxItems;
    this.onChange(this.list());
    return true;
  }
  list() {return this.items.map(item=>({...item}));}
  markRead(id) {
    const item=this.items.find(item=>item.id===id);
    if(!item)return false;
    item.read=true;this.onChange(this.list());return true;
  }
  dismiss(id) {
    const index=this.items.findIndex(item=>item.id===id);
    if(index<0)return false;
    this.items.splice(index,1);this.dismissed.add(id);this.onChange(this.list());return true;
  }
  clear() {this.items=[];this.dismissed.clear();this.onChange(this.list());}
}
