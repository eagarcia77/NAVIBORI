import type { Json } from "@/lib/supabase/database.types";

export function toJsonValue(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
