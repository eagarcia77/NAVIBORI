import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type SpatialPublicationAction =
  | "submit_spatial_revision"
  | "approve_spatial_revision"
  | "publish_spatial_revision";

export interface PublicationActionResult {
  id: string;
  status: string;
  revisionNumber: number;
  venueId: string;
}

export async function runSpatialPublicationAction(
  client: SupabaseClient<Database>,
  action: SpatialPublicationAction,
  revisionId: string,
  note?: string
): Promise<PublicationActionResult> {
  const { data, error } = await client.rpc(action, {
    p_revision_id: revisionId,
    p_note: note ?? undefined
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Supabase did not return the updated spatial revision.");
  }

  return {
    id: data.id,
    status: data.status,
    revisionNumber: data.revision_number,
    venueId: data.venue_id
  };
}
