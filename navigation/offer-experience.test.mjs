import test from "node:test";
import assert from "node:assert/strict";
import {OfferExperience} from "./offer-experience.js";
import {ProximityOffers} from "./proximity-offers.js";
const time=Date.parse("2026-10-11T12:00:00Z");
const merchant={id:"m",name:"Shop",location:{lat:18,lng:-66},promotion:{id:"p",title:"Oferta",startsAt:"2026-10-11T00:00:00Z",endsAt:"2026-10-12T00:00:00Z"}};
function setup(){const notices=[];const app=new OfferExperience({proximity:new ProximityOffers({now:()=>time}),onNotice:x=>notices.push(x)});app.setMerchants([merchant]);return {app,notices};}
test("does not notify without consent",()=>{const x=setup();x.app.onGpsFix({lat:18,lng:-66,accuracyMeters:10});assert.equal(x.app.getNotifications().length,0);});
test("nearby promotion appears in inbox",()=>{const x=setup();x.app.setConsent(true);x.app.onGpsFix({lat:18,lng:-66,accuracyMeters:10});assert.equal(x.app.getNotifications().length,1);assert.equal(x.notices[0].type,"promotion");});
test("does not duplicate on repeated GPS fixes",()=>{const x=setup();x.app.setConsent(true);for(let i=0;i<3;i++)x.app.onGpsFix({lat:18,lng:-66,accuracyMeters:10});assert.equal(x.app.getNotifications().length,1);});
test("revoking consent stops notifications",()=>{const x=setup();x.app.setConsent(true);x.app.setConsent(false);x.app.onGpsFix({lat:18,lng:-66,accuracyMeters:10});assert.equal(x.app.getNotifications().length,0);});
test("dispose clears inbox and disables alerts",()=>{const x=setup();x.app.setConsent(true);x.app.onGpsFix({lat:18,lng:-66,accuracyMeters:10});x.app.dispose();assert.equal(x.app.getNotifications().length,0);});
