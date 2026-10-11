import test from "node:test";
import assert from "node:assert/strict";
import {ProximityOffers,eligibleOffer} from "./proximity-offers.js";
const now=Date.parse("2026-10-11T12:00:00Z");
const merchant={id:"shop",name:"Shop",location:{lat:18,lng:-66},promotion:{id:"deal1",title:"20% discount",startsAt:"2026-10-11T00:00:00Z",endsAt:"2026-10-12T00:00:00Z"}};
const position={lat:18,lng:-66,accuracyMeters:12};
function setup(){const sent=[];const service=new ProximityOffers({now:()=>now,onOffer:x=>sent.push(x)});service.setMerchants([merchant]);return {service,sent};}
test("requires explicit opt-in",()=>{const {service}=setup();assert.equal(service.updatePosition(position).length,0);});
test("emits active offer when nearby and opted in",()=>{const {service,sent}=setup();service.setConsent(true);assert.equal(service.updatePosition(position).length,1);assert.equal(sent[0].offerId,"deal1");});
test("does not repeat offer while staying inside",()=>{const {service}=setup();service.setConsent(true);service.updatePosition(position);assert.equal(service.updatePosition(position).length,0);});
test("rejects expired promotions",()=>assert.equal(eligibleOffer(merchant,Date.parse("2026-10-13T00:00:00Z")),false));
test("ignores inaccurate GPS fixes",()=>{const {service}=setup();service.setConsent(true);assert.equal(service.updatePosition({...position,accuracyMeters:90}).length,0);});
test("requires physical proximity",()=>{const {service}=setup();service.setConsent(true);assert.equal(service.updatePosition({...position,lat:18.01}).length,0);});
test("consent revocation disables alerts",()=>{const {service}=setup();service.setConsent(true);service.setConsent(false);assert.equal(service.updatePosition(position).length,0);});
