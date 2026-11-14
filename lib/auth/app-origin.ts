/** Keep existing Render deployments working until their origin is configured. */
const LEGACY_ORIGIN = "https://navibori.onrender.com";

export function resolveAppOrigin(value: string | undefined, environment?: string, requireExplicit = false): string {
  if (!value?.trim()) {
    if (requireExplicit) throw new Error("Set NEXT_PUBLIC_APP_URL to the owned HTTPS site origin before deploying to Netlify.");
    return LEGACY_ORIGIN;
  }
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute origin."); }
  const local = environment !== "production" && url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if ((!local && url.protocol !== "https:") || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an HTTPS origin without credentials, path, query or fragment.");
  }
  return url.origin;
}
