function icsDate(value:Date){
  return value.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
}

function escapeIcs(value:string){
  return value
    .replace(/\\/g,"\\\\")
    .replace(/\n/g,"\\n")
    .replace(/,/g,"\\,")
    .replace(/;/g,"\\;");
}

export function buildRequestCalendarIcs(input:{
  requestId:string;
  businessName:string;
  fulfillmentMethod:string;
  startsAt:string;
  slotMinutes:number;
}){
  const start=new Date(input.startsAt);
  const end=new Date(start.getTime()+Math.max(1,input.slotMinutes)*60_000);
  const method=input.fulfillmentMethod==="pickup"
    ? "Pickup"
    : input.fulfillmentMethod==="reservation"
      ? "Reservación"
      : "Solicitud";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NAVIBORI XR//Commerce Request//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:"+escapeIcs(input.requestId)+"@navibori",
    "DTSTAMP:"+icsDate(new Date()),
    "DTSTART:"+icsDate(start),
    "DTEND:"+icsDate(end),
    "SUMMARY:"+escapeIcs(method+" · "+input.businessName),
    "DESCRIPTION:"+escapeIcs("Solicitud NAVIBORI · Ref. "+input.requestId.slice(0,8)),
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
