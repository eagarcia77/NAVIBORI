/** Coordinates in-app promotions with user-consented foreground GPS fixes. */
import {ProximityOffers} from "./proximity-offers.js";
import {PromotionInbox} from "./promotion-inbox.js";
export class OfferExperience {
  constructor({proximity=new ProximityOffers(),inbox=new PromotionInbox(),onNotice=()=>{}}={}) {
    this.proximity=proximity;this.inbox=inbox;this.onNotice=onNotice;
    const original=this.proximity.onOffer;
    this.proximity.onOffer=offer=>{
      original(offer);
      if(this.inbox.receive(offer)) this.onNotice({type:"promotion",offer});
    };
  }
  setConsent(enabled) {
    this.proximity.setConsent(enabled);
    if(!enabled)this.onNotice({type:"alerts-disabled"});
  }
  setMerchants(merchants) {this.proximity.setMerchants(merchants);}
  onGpsFix(position) {return this.proximity.updatePosition(position);}
  dismiss(id) {return this.inbox.dismiss(id);}
  markRead(id) {return this.inbox.markRead(id);}
  getNotifications() {return this.inbox.list();}
  dispose() {this.setConsent(false);this.proximity.setMerchants([]);this.inbox.clear();}
}
