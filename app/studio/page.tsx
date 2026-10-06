import Link from "next/link";
import { redirect } from "next/navigation";
import StudioWorkspace from "@/components/studio/studio-workspace";
import BackendGeoJsonImporter from "@/components/studio/backend-geojson-importer";
import RevisionQueue from "@/components/studio/revision-queue";
import StudioSessionBar from "@/components/studio/studio-session-bar";
import StudioAccessDenied from "./access-denied";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;
  const email = String(claimsData.claims.email ?? "usuario autenticado");

  const { data: memberships, error: membershipError } = await supabase.rpc("my_venue_memberships");

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!memberships || memberships.length === 0) {
    return <StudioAccessDenied email={email} />;
  }

  const venue = memberships[0];
  const venueRoles = memberships
    .filter((membership) => membership.venue_id === venue.venue_id)
    .map((membership) => membership.role);

  const { data: revisions, error: revisionsError } = await supabase
    .from("spatial_revisions")
    .select("*")
    .eq("venue_id", venue.venue_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (revisionsError) {
    throw new Error(revisionsError.message);
  }

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <p className="eyebrow">NAVIBORI Studio</p>
          <h1>Spatial CMS <span>v0.2</span></h1>
          <p className="pilot">{venue.venue_name} · {venue.venue_status}</p>
        </div>
        <Link className="studio-back-link" href="/">Volver al mapa</Link>
      </header>

      <StudioSessionBar
        email={email}
        venueName={venue.venue_name}
        roles={venueRoles}
      />

      <StudioWorkspace />

      <div className="studio-import-section">
        <BackendGeoJsonImporter venueId={venue.venue_id} />
        <RevisionQueue
          venueId={venue.venue_id}
          roles={venueRoles}
          initialRevisions={revisions ?? []}
        />
      </div>

      <p className="xr-note">Session subject: {userId}</p>
    </main>
  );
}
