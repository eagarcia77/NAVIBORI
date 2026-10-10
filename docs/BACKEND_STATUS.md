# NAVIBORI Backend Status

## Dedicated Supabase project
Project name: **NAVIBORI**  
Project ref: `dwvmkmdrekovuckcyvfq`  
Region: `us-east-1`

The project is separate from FYNEXO and other existing applications.

## Applied migrations
1. `navibori_foundation`
2. `spatial_publication_v02`
3. `public_canonical_read_policies_and_fk_indexes`
4. `secure_spatial_publication_rpcs`

## Current security state
- PostGIS enabled in `extensions`
- RLS enabled on all NAVIBORI public tables
- Supabase security advisor: zero active findings after hardening
- public discovery is read-only and limited by active venue / public content policies
- draft/review/publication data requires authenticated venue membership
- publication workflow uses authenticated RPCs and audit events
- authors cannot approve their own revision
- reviewers cannot publish the same revision

## Pilot record
Pilot 001 is stored canonically as:
**Mercado Metropolitano de Juana Díaz**

Status: `draft`

No center coordinate, floor plan, route graph, accessibility path, emergency data or POI geometry has been invented.

## Environment
Runtime deployment must provide:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not commit secret/service-role keys.
