export const BUSINESS_CATEGORIES=["gastronomia","compras","servicios","artesania","bienestar","otros"] as const;
export function registrationInput(form:FormData){
  const text=(key:string)=>String(form.get(key)??"").trim();
  const input={p_venue_id:text("venue"),p_name:text("name"),p_category:text("category"),
    p_description:text("description"),p_phone:text("phone"),p_whatsapp:text("whatsapp").replace(/[\s()-]/g,""),
    p_website:text("website"),p_address:text("address")};
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.p_venue_id)||
    input.p_name.length<2||input.p_name.length>120||input.p_description.length<10||input.p_description.length>2000||
    !(BUSINESS_CATEGORIES as readonly string[]).includes(input.p_category)||input.p_phone.length>40||input.p_address.length>500||
    (!input.p_phone&&!input.p_whatsapp&&!input.p_website))throw new Error("Completa nombre, descripción y un medio de contacto.");
  if(input.p_whatsapp&&!/^[+]?[1-9][0-9]{7,14}$/.test(input.p_whatsapp))throw new Error("WhatsApp debe incluir el código de país, por ejemplo +17875551234.");
  if(input.p_website){
    try{const url=new URL(input.p_website);if(!["https:","http:"].includes(url.protocol)||input.p_website.length>2048)throw new Error();}
    catch{throw new Error("El sitio web debe ser una dirección http:// o https:// válida.");}
  }
  if(text("accept")!=="yes")throw new Error("Confirma que estás autorizado para administrar este comercio.");
  return input;
}
