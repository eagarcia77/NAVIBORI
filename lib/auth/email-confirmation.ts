import { resolveAppOrigin } from "./app-origin";

/** Operator-configured origin only. Never trust request Host/forwarded headers. */
export const NAVIBORI_AUTH_CALLBACK_URL = resolveAppOrigin(
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NODE_ENV,
  process.env.NETLIFY === "true"
) + "/auth/callback";

/** Input validation only; Supabase Auth decides whether an account exists. */
export function normalizeConfirmationEmail(input:FormDataEntryValue|null):string|null{
  if(typeof input!=="string")return null;
  const email=input.trim().toLowerCase();
  if(email.length<5||email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))){
    return null;
  }
  return email;
}
