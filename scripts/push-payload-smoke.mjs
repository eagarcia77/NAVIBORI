// Run with Deno using installed npm packages. No requests are sent.
import {createECDH,generateKeyPairSync,randomBytes} from "node:crypto";
import {strict as assert} from "node:assert";
import ece from "npm:http_ece@1.2.0";
import {preparePromotionPush} from "../supabase/functions/_shared/web-push.ts";
const userKey=createECDH("prime256v1");userKey.generateKeys();
const auth=randomBytes(16);
const subscription={endpoint:"https://fcm.googleapis.com/fcm/send/audit-only-not-sent",p256dh:userKey.getPublicKey().toString("base64url"),auth:auth.toString("base64url")};
const vapid=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
const jwk=vapid.publicKey.export({format:"jwk"});
const publicKey=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,"base64url"),Buffer.from(jwk.y,"base64url")]).toString("base64url");
const pkcs8=vapid.privateKey.export({format:"der",type:"pkcs8"}).toString("base64");
const payload={id:"promotion-exact",title:"Oferta de prueba",url:"/comercios/audit"};
const details=await preparePromotionPush(subscription,pkcs8,payload,publicKey);
assert.equal(details.headers["Content-Encoding"],"aes128gcm");
const clear=ece.decrypt(details.body,{version:"aes128gcm",privateKey:userKey,authSecret:auth});
assert.deepEqual(JSON.parse(clear.toString()),payload);
let denied=false;
try{await preparePromotionPush({...subscription,endpoint:"https://127.0.0.1/blocked"},pkcs8,payload,publicKey);}catch{denied=true;}
assert.equal(denied,true);
console.log("PASS: encrypted payload round-trip, exact promotion and blocked outbound host; no network delivery");
