import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const PILOT_001_SLUG = "mercado-metropolitano-juana-diaz";

export async function getPilotVenue(client: SupabaseClient<Database>) {
  const { data, error } = await client
    .from("venues")
    .select("id,name,slug,status,municipality_id")
    .eq("slug", PILOT_001_SLUG)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
