import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type PublishedSpatialItem =
  Database["public"]["Functions"]["get_published_spatial_dataset"]["Returns"][number];

export async function getPublishedSpatialDataset(
  client: SupabaseClient<Database>,
  venueId: string
): Promise<PublishedSpatialItem[]> {
  const { data, error } = await client.rpc("get_published_spatial_dataset", {
    p_venue_id: venueId
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function getPublishedGeoJsonAssets(items: PublishedSpatialItem[]) {
  return items.filter((item) => {
    if (item.entity_type !== "asset" || !item.payload || Array.isArray(item.payload)) {
      return false;
    }

    return typeof item.payload === "object"
      && item.payload !== null
      && "kind" in item.payload
      && item.payload.kind === "geojson_import";
  });
}
