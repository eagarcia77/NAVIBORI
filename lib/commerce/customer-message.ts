export type CustomerUpdateStatus=
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "no_show";

export interface CustomerUpdateInput {
  businessName:string;
  reference:string;
  status:CustomerUpdateStatus|string;
  fulfillmentMethod:string;
  requestedFor?:string|null;
  estimatedReadyAt?:string|null;
  timeZone:string;
}

function formatDateTime(value:string,timeZone:string){
  return new Intl.DateTimeFormat("es-PR",{
    timeZone,
    dateStyle:"medium",
    timeStyle:"short"
  }).format(new Date(value));
}

export function buildCustomerStatusMessage(input:CustomerUpdateInput){
  const scheduled=input.requestedFor
    ? formatDateTime(input.requestedFor,input.timeZone)
    : null;
  const estimate=input.estimatedReadyAt
    ? formatDateTime(input.estimatedReadyAt,input.timeZone)
    : null;
  const ref=input.reference.slice(0,8);

  let update="Tu solicitud fue recibida.";

  if(input.status==="accepted"){
    update=scheduled
      ? "Tu solicitud fue aceptada para "+scheduled+"."
      : "Tu solicitud fue aceptada.";
  }else if(input.status==="preparing"){
    update="Tu solicitud está en preparación.";
  }else if(input.status==="ready"){
    update=input.fulfillmentMethod==="pickup"
      ? "Tu solicitud está lista para recoger."
      : "Tu solicitud está lista para ser atendida.";
  }else if(input.status==="completed"){
    update="Tu solicitud fue completada.";
  }else if(input.status==="cancelled"){
    update="Tu solicitud fue cancelada.";
  }else if(input.status==="no_show"){
    update="La solicitud fue cerrada como no-show.";
  }

  if(estimate && ["accepted","preparing"].includes(input.status)){
    update+=" Tiempo estimado: "+estimate+".";
  }

  return [
    input.businessName+" · NAVIBORI",
    "Ref. "+ref,
    update
  ].join("\n");
}

export function buildCustomerContactHref(
  method:string,
  contactValue:string,
  message:string
){
  if(method==="email"){
    const subject="Actualización de tu solicitud NAVIBORI";
    return "mailto:"+encodeURIComponent(contactValue)+
      "?subject="+encodeURIComponent(subject)+
      "&body="+encodeURIComponent(message);
  }

  if(method==="whatsapp"){
    const phone=contactValue.replace(/\D/g,"");
    return "https://wa.me/"+phone+"?text="+encodeURIComponent(message);
  }

  return "tel:"+contactValue;
}
