-- NAVIBORI XR — Spatial Publication v0.2
-- Design draft only. Do not apply until the dedicated NAVIBORI Supabase/PostGIS project exists.
-- Depends on the foundation schema in SUPABASE_SCHEMA_DRAFT.sql.

create table if not exists public.spatial_revisions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  entity_id uuid not null,
  entity_type text not null check (entity_type in (
    'building','floor','space','poi','route_node','route_edge','ar_anchor','asset'
  )),
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft' check (status in (
    'draft','in_review','approved','published','superseded'
  )),
  source_label text not null check (length(trim(source_label)) > 0),
  payload jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_by uuid references auth.users(id),
  published_at timestamptz,
  supersedes_revision_id uuid references public.spatial_revisions(id),
  unique (venue_id, entity_type, entity_id, revision_number)
);

create table if not exists public.publication_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  revision_id uuid not null references public.spatial_revisions(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','approved','rejected','published','superseded')),
  actor_id uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  venue_id uuid references public.venues(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  revision_id uuid references public.spatial_revisions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists spatial_revisions_venue_entity_idx
  on public.spatial_revisions(venue_id, entity_type, entity_id, revision_number desc);

create index if not exists spatial_revisions_status_idx
  on public.spatial_revisions(venue_id, status);

create index if not exists publication_events_revision_idx
  on public.publication_events(revision_id, created_at);

create index if not exists audit_logs_venue_created_idx
  on public.audit_logs(venue_id, created_at desc);

alter table public.spatial_revisions enable row level security;
alter table public.publication_events enable row level security;
alter table public.audit_logs enable row level security;

-- Helper functions are SECURITY DEFINER so policies can check membership
-- without recursively exposing membership rows.
create schema if not exists navibori_private;

create or replace function navibori_private.has_venue_role(
  target_venue uuid,
  accepted_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, navibori_private
as $
  select auth.uid() is not null
    and exists (
      select 1
      from public.venue_memberships vm
      where vm.venue_id = target_venue
        and vm.user_id = auth.uid()
        and vm.role = any(accepted_roles)
    );
$;

revoke all on function navibori_private.has_venue_role(uuid, text[]) from public;
grant usage on schema navibori_private to authenticated;
grant execute on function navibori_private.has_venue_role(uuid, text[]) to authenticated;

-- Editors/managers can read revisions for their venue.
create policy "venue staff can read spatial revisions"
on public.spatial_revisions for select
to authenticated
using (
  navibori_private.has_venue_role(
    venue_id,
    array['platform_owner','municipality_admin','venue_manager','content_editor','analytics_viewer']
  )
);

-- Editors may create drafts only.
create policy "editors can create draft revisions"
on public.spatial_revisions for insert
to authenticated
with check (
  status = 'draft'
  and created_by = auth.uid()
  and navibori_private.has_venue_role(
    venue_id,
    array['platform_owner','municipality_admin','venue_manager','content_editor']
  )
);

-- v0.2 intentionally does NOT permit direct client UPDATE to published workflow fields.
-- Production transitions should execute through reviewed database functions / server actions
-- that enforce actor role, separation of duties, valid state transitions and audit events.

create policy "venue staff can read publication events"
on public.publication_events for select
to authenticated
using (
  navibori_private.has_venue_role(
    venue_id,
    array['platform_owner','municipality_admin','venue_manager','content_editor','analytics_viewer']
  )
);

create policy "venue staff can read audit logs"
on public.audit_logs for select
to authenticated
using (
  navibori_private.has_venue_role(
    venue_id,
    array['platform_owner','municipality_admin','venue_manager','analytics_viewer']
  )
);

-- Production recommendation:
-- create RPC functions submit_revision(), approve_revision(), publish_revision()
-- and revoke raw mutation privileges for workflow-controlled fields.


-- Explicit Data API grants (required for new Supabase projects).
-- RLS remains the row-level authorization layer.
grant select, insert on public.spatial_revisions to authenticated;
grant select on public.publication_events to authenticated;
grant select on public.audit_logs to authenticated;

revoke all on public.spatial_revisions from anon;
revoke all on public.publication_events from anon;
revoke all on public.audit_logs from anon;
