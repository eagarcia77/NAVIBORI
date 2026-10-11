/** Privacy-first merchant search: no GPS watch, no background polling. */
import { CommerceDiscovery } from "./commerce-discovery.js";
import { NavigationSession } from "./navigation-session.js";
import { validateMode } from "./directions-client.js";
const valid=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
export class MerchantJourney {
  constructor({discovery,navigation,onState=()=>{}}={}) {
    if(!(discovery instanceof CommerceDiscovery)||!(navigation instanceof NavigationSession))
      throw new TypeError("Commerce discovery and navigation session required");
    this.discovery=discovery;this.navigation=navigation;this.onState=onState;
    this.origin=null;this.mode="driving";
  }
  async findNearby(position,radiusMeters=2000) {
    if(!valid(position)) throw new TypeError("Valid location required");
    this.origin={lat:position.lat,lng:position.lng};
    await this.discovery.search(this.origin,{radiusMeters});
  }
  chooseCommerce(id) {
    const merchant=this.discovery.select(id);
    if(merchant) this.onState({type:"merchant-selected",merchant});
    return merchant;
  }
  setTransportMode(mode) {
    this.mode=validateMode(mode);
    this.onState({type:"mode",mode});
  }
  async navigateToSelected() {
    const merchant=this.discovery.selected;
    if(!merchant||!valid(this.origin)) {
      this.onState({type:"missing-destination"});
      return false;
    }
    this.onState({type:"navigation-requested",merchant,mode:this.mode});
    await this.navigation.start({origin:this.origin,destination:merchant.location,mode:this.mode});
    return true;
  }
  stop() {this.navigation.stop();this.onState({type:"navigation-stopped"});}
}
