import type {CommerceHours} from "./types";
const days=["mon","tue","wed","thu","fri","sat","sun"] as const;
/** A complete, explicitly saved weekly schedule; closed days need no times. */
export function validMerchantHours(value:unknown):value is CommerceHours[]{
  if(!Array.isArray(value)||value.length!==7)return false;
  const seen=new Set<string>();
  const time=(v:unknown):v is string=>typeof v==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  return value.every(row=>{
    if(!row||typeof row!=="object"||!days.includes(row.day)||seen.has(row.day)||typeof row.closed!=="boolean")return false;
    seen.add(row.day);
    return row.closed||(time(row.opens)&&time(row.closes)&&row.opens<row.closes);
  });
}
export function emptyMerchantHours():CommerceHours[]{
  return days.map(day=>({day,opens:null,closes:null,closed:true}));
}
export function merchantVerificationLabel(published:boolean,pending:boolean,ready:boolean){
  if(published)return "Publicado y verificado";
  if(pending)return "En revisión";
  return ready?"Datos listos para solicitar revisión":"Perfil incompleto";
}
