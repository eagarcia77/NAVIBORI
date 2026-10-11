import test from "node:test";
import assert from "node:assert/strict";
import {PromotionInbox} from "./promotion-inbox.js";
const offer={merchantId:"m",offerId:"p",merchantName:"Shop",title:"Oferta"};
test("adds a merchant promotion to inbox",()=>{const inbox=new PromotionInbox();assert.equal(inbox.receive(offer),true);assert.equal(inbox.list().length,1);});
test("prevents duplicate offer",()=>{const inbox=new PromotionInbox();inbox.receive(offer);assert.equal(inbox.receive(offer),false);});
test("marks message as read",()=>{const inbox=new PromotionInbox();inbox.receive(offer);assert.equal(inbox.markRead("m:p"),true);assert.equal(inbox.list()[0].read,true);});
test("dismissed offer stays dismissed",()=>{const inbox=new PromotionInbox();inbox.receive(offer);inbox.dismiss("m:p");assert.equal(inbox.receive(offer),false);});
test("caps the number of promotions",()=>{const inbox=new PromotionInbox({maxItems:1});inbox.receive(offer);inbox.receive({...offer,offerId:"other"});assert.equal(inbox.list().length,1);});
