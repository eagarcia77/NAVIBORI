import webpush from "npm:web-push@3.6.7";
import {allowedPushEndpoint} from "./push-policy.ts";
const PUBLIC_KEY="BEdUyyPZWN3Hhj-ecrZH-Nxs-reG4eJo3nBwXckRK5J-4pBej6LMYUqkpHw2xix-ak1OgT9OMiwdadHaJJQW8Og";
export async function preparePromotionPush(subscription:{endpoint:string;p256dh:string;auth:string},pkcs8:string,payload:unknown,publicKey=PUBLIC_KEY){
  if(!allowedPushEndpoint(subscription.endpoint))throw new Error("unsupported_push_endpoint");
  const key=await crypto.subtle.importKey("pkcs8",Uint8Array.from(atob(pkcs8),c=>c.charCodeAt(0)),{name:"ECDSA",namedCurve:"P-256"},true,["sign"]);
  const jwk=await crypto.subtle.exportKey("jwk",key);
  if(!jwk.d)throw new Error("invalid_vapid_configuration");
  const details=webpush.generateRequestDetails({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify(payload),{
    vapidDetails:{subject:"https://navibori.onrender.com",publicKey,privateKey:jwk.d},
    TTL:3600,urgency:"normal",contentEncoding:"aes128gcm"
  });
  return details;
}
export async function sendPromotionPush(subscription:{endpoint:string;p256dh:string;auth:string},pkcs8:string,payload:unknown){
  const details=await preparePromotionPush(subscription,pkcs8,payload);
  return fetch(subscription.endpoint,{method:"POST",headers:details.headers,body:new Uint8Array(details.body).buffer,
    redirect:"error",signal:AbortSignal.timeout(10000)});
}
