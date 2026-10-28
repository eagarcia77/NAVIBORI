# NAVIBORI — Supabase Integration

## Status
Code integration is prepared, but no dedicated NAVIBORI Supabase project has been created yet.

Existing connected Supabase projects belong to other applications and must not be reused.

## Current client strategy
NAVIBORI follows the current Supabase SSR pattern:
- `@supabase/supabase-js`
- `@supabase/ssr`
- modern publishable keys
- browser client for Client Components
- request-scoped server client for Server Components / Route Handlers / Server Actions

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose secret/service-role keys to client code.

## Data API change
New Supabase projects no longer automatically expose new public-schema tables to the Data API. NAVIBORI migrations therefore must include explicit role grants in addition to RLS policies.

## Auth
When authentication is enabled:
- use `auth.getClaims()` to protect server-side pages/actions;
- do not authorize from user-editable metadata;
- venue authorization belongs in database membership tables;
- sensitive workflow transitions should be server/RPC-controlled.

## Next activation steps
1. Create dedicated NAVIBORI Supabase project after explicit cost confirmation.
2. Enable PostGIS in a dedicated extensions schema.
3. Apply reviewed schema iteratively.
4. Run security/performance advisors.
5. Add explicit Data API grants.
6. Generate TypeScript database types.
7. Connect Studio read-only first.
8. Add reviewed mutation RPCs.
