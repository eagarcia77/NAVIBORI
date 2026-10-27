export type PromotionStatusInput={active:boolean;starts_at:string|null;ends_at:string|null};
export function promotionStatus(p:PromotionStatusInput,canActivate:boolean,now=Date.now()){
  if(!p.active)return "Pausada";
  if(!canActivate)return "En borrador";
  const start=p.starts_at?Date.parse(p.starts_at):-Infinity;
  const end=p.ends_at?Date.parse(p.ends_at):Infinity;
  if(Number.isNaN(start)||Number.isNaN(end)||start>=end)return "Fechas inválidas";
  if(now<start)return "Programada";
  if(now>=end)return "Vencida";
  return "Vigente";
}
export function pushResultMessage(result:{duplicate?:boolean;noSubscribers?:boolean;status?:string;sentCount?:number;failedCount?:number}){
  if(result.duplicate){
    if(result.status==="failed")return "El intento anterior falló. Solicita al administrador que revise el envío.";
    if(result.status==="sending")return "Este anuncio tiene un envío en proceso.";
    if(result.status==="partial")return "El envío anterior fue parcial; algunos dispositivos no lo aceptaron.";
    if(result.status==="sent")return "El servicio push ya aceptó este anuncio. La recepción depende del celular.";
    return "Este anuncio ya tiene un intento de envío registrado.";
  }
  if(result.noSubscribers)return "No hay dispositivos suscritos todavía.";
  const sent=Number(result.sentCount??0),failed=Number(result.failedCount??0);
  if(sent===0&&failed>0)return "El servicio push no aceptó el envío. Solicita revisión al administrador.";
  return "Envío aceptado por el servicio push para "+sent+" dispositivo(s)."+
    (failed>0?" No se pudo entregar a "+failed+" dispositivo(s).":"")+" La recepción depende del celular.";
}
