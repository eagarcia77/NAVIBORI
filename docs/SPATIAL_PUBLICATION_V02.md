# NAVIBORI Spatial Publication v0.2

## Purpose
Create a controlled chain from verified source material to public 2D/3D/XR experiences.

## Canonical publication chain
Verified source → import → draft revision → review → approval → publication → canonical spatial query → Maps / Wayfinding / Twin / AR / VR / AI.

## Separation of duties
Recommended production mode:
- Editor creates and submits.
- Reviewer approves.
- Publisher releases.
- Sensitive spatial classes may require different users for all three roles.

## Sensitive classes
The strictest review should apply to:
- accessible routes and barriers;
- stairs/elevators/ramps;
- route closures;
- emergency-related metadata;
- positioning anchors.

## Database strategy
The v0.2 SQL draft introduces:
- `spatial_revisions`
- `publication_events`
- `audit_logs`
- venue-role helper for RLS

Raw browser updates of workflow-controlled publication state are intentionally not permitted. Production transitions should execute through reviewed RPC functions or server actions.

## Twin generation
Published polygon geometry can be converted into an intermediate extrusion descriptor:
- footprint
- elevation
- height
- stable ID
- label

Three.js then renders those descriptors. This keeps the authoritative spatial model independent of any single renderer and lets 2D, WebGL/WebGPU and XR consume the same approved data.

## Current limitation
No SQL in this document has been applied to a live NAVIBORI database because a dedicated Supabase project has not yet been created.
