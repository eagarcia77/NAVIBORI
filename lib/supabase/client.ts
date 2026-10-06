import { createBrowserClient } from "@supabase/ssr";

function requirePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("NAVIBORI Supabase public configuration is not set.");
  }

  return { url, key };
}

export function createClient() {
  const { url, key } = requirePublicConfig();
  return createBrowserClient(url, key);
}
