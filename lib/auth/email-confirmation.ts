/** Fixed, owned redirect URL. Never use an untrusted Host header here. */
export const NAVIBORI_AUTH_CALLBACK_URL="https://navibori.onrender.com/auth/callback";

/** Input validation only; Supabase Auth decides whether an account exists. */
export function normalizeConfirmationEmail(input:FormDataEntryValue|null):string|null{
  if(typeof input!=="string")return null;
  const email=input.trim().toLowerCase();
  if(email.length<5||email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))){
    return null;
  }
  return email;
}
