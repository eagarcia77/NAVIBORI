import {normalizeConfirmationEmail} from "./email-confirmation";
export function accountCredentials(form:FormData,signup=false){
  const email=normalizeConfirmationEmail(form.get("email"));
  const password=form.get("password");
  if(!email||typeof password!=="string"||!password)return {error:"Escribe un correo válido y tu contraseña."} as const;
  if(signup&&password.length<8)return {error:"La contraseña debe tener al menos 8 caracteres."} as const;
  return {email,password} as const;
}
export function newPassword(form:FormData){
  const password=form.get("password");
  const confirmation=form.get("confirmPassword");
  if(typeof password!=="string"||password.length<8)return {error:"La contraseña debe tener al menos 8 caracteres."} as const;
  if(password!==confirmation)return {error:"Las contraseñas no coinciden."} as const;
  return {password} as const;
}
/** Never echo backend messages, addresses, tokens or password values to the URL. */
export function accountError(code?:string){
  switch(code){
    case "email_not_confirmed":return "Confirma tu correo antes de iniciar sesión. Puedes solicitar otro enlace abajo.";
    case "over_email_send_rate_limit":case "over_request_rate_limit":return "Has realizado varias solicitudes. Espera unos minutos e inténtalo nuevamente.";
    case "weak_password":return "Elige una contraseña más segura, con letras, números y símbolos.";
    case "same_password":return "Elige una contraseña diferente a la anterior.";
    case "reauthentication_needed":case "session_not_found":case "refresh_token_not_found":return "La sesión necesita verificarse de nuevo. Solicita otro enlace de recuperación.";
    default:return "No se pudo completar la solicitud. Verifica tus datos e inténtalo nuevamente.";
  }
}
