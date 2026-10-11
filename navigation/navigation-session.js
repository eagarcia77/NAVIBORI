/** NAVIBORI navigation session orchestration. Does not supply a routing backend. */
import { NavigationTracker } from "./navigation-core.js";
import { DirectionsClient } from "./directions-client.js";
import { routeProgress } from "./route-progress.js";
export class NavigationSession {
  constructor({mapAdapter,directions=new DirectionsClient(),onState=()=>{},trackerFactory=options=>new NavigationTracker(options)}={}) {
    if (!mapAdapter || typeof mapAdapter.setRoute!=="function" || typeof mapAdapter.updatePosition!=="function")
      throw new TypeError("Map adapter required");
    this.map=mapAdapter; this.directions=directions; this.onState=onState;
    this.destination=null; this.mode="driving"; this.active=false;
    this.generation=0; this.controller=null; this.route=null; this.lastRerouteAt=0;
    this.tracker=trackerFactory({
      onPosition:p=>this.handlePosition(p),
      onStatus:status=>this.onState({type:"gps",status}),
      onDeviation:()=>this.reroute()
    });
  }
  async start({origin,destination,mode="driving"}) {
    this.stop();
    this.lastRerouteAt=0;
    this.destination=destination;this.mode=mode;this.active=true;
    const id=++this.generation;
    const controller=new AbortController();this.controller=controller;
    this.onState({type:"routing"});
    try {
      const route=await this.directions.route({origin,destination,mode,signal:controller.signal});
      if(!this.active || id!==this.generation) return;
      this.route=route;this.tracker.setRoute(route.coordinates);this.map.setRoute(route.coordinates);
      this.onState({type:"route",route});
      this.tracker.start();
    } catch(error) {
      if(!this.active || id!==this.generation) return;
      this.active=false;
      this.destination=null;
      this.onState({type:"error",message:error.message});
    }
  }
  handlePosition(point) {
    if(!this.active) return;
    this.map.updatePosition(point);
    const progress=this.route ? routeProgress(this.route.coordinates,point) : null;
    this.onState({type:"position",point,progress});
  }
  async reroute() {
    if(!this.active || !this.destination || !this.tracker.lastPosition) return;
    if(Date.now()-this.lastRerouteAt<15000) return;
    this.lastRerouteAt=Date.now();
    const id=++this.generation;
    this.controller?.abort();
    const controller=new AbortController();this.controller=controller;
    this.onState({type:"rerouting"});
    try {
      const route=await this.directions.route({origin:this.tracker.lastPosition,destination:this.destination,mode:this.mode,signal:controller.signal});
      if(!this.active || id!==this.generation) return;
      this.route=route;this.tracker.setRoute(route.coordinates);this.map.setRoute(route.coordinates);
      this.onState({type:"route",route});
    } catch(error) {
      if(this.active && id===this.generation && error.name!=="AbortError")
        this.onState({type:"reroute-error",message:error.message});
    }
  }
  stop() {
    this.generation++;
    this.controller?.abort();this.controller=null;
    this.active=false;this.route=null;this.destination=null;
    this.tracker.stop();
  }
}
