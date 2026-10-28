-- NAVIBORI XR — Supabase/PostGIS schema draft
-- Design-only. Do not apply until the dedicated NAVIBORI Supabase project is created.
-- PostGIS should be installed in a dedicated schema (for example extensions), not public.

create schema if not exists navibori_private;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.municipalities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  center extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, slug)
);

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  footprint extensions.geometry(multipolygon, 4326),
  created_at timestamptz not null default now()
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  level integer not null,
  sort_order integer not null default 0,
  unique (building_id, level)
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  name text not null,
  space_type text not null default 'general',
  geometry extensions.geometry(multipolygon, 4326),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pois (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete set null,
  space_id uuid references public.spaces(id) on delete set null,
  name text not null,
  category text not null,
  location extensions.geometry(point, 4326),
  is_public boolean not null default true,
  is_accessible boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_nodes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete cascade,
  location extensions.geometry(point, 4326) not null,
  node_type text not null default 'path',
  is_accessible boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.route_edges (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  from_node_id uuid not null references public.route_nodes(id) on delete cascade,
  to_node_id uuid not null references public.route_nodes(id) on delete cascade,
  distance_m numeric(10,2) not null check (distance_m >= 0),
  travel_time_s integer check (travel_time_s is null or travel_time_s >= 0),
  is_accessible boolean not null default true,
  has_stairs boolean not null default false,
  uses_elevator boolean not null default false,
  indoor boolean not null default true,
  temporarily_closed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  name text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  description text,
  phone text,
  website text,
  metadata jsonb not null default '{}'::jsonb,
  unique (venue_id, slug)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  poi_id uuid references public.pois(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.venue_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  role text not null check (role in ('platform_owner','municipality_admin','venue_manager','merchant','event_manager','content_editor','analytics_viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id, role)
);

create index if not exists venues_center_gix on public.venues using gist(center);
create index if not exists buildings_footprint_gix on public.buildings using gist(footprint);
create index if not exists spaces_geometry_gix on public.spaces using gist(geometry);
create index if not exists pois_location_gix on public.pois using gist(location);
create index if not exists route_nodes_location_gix on public.route_nodes using gist(location);
create index if not exists route_edges_venue_idx on public.route_edges(venue_id);
create index if not exists businesses_venue_idx on public.businesses(venue_id);
create index if not exists events_venue_idx on public.events(venue_id, starts_at);

alter table public.organizations enable row level security;
alter table public.municipalities enable row level security;
alter table public.venues enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.spaces enable row level security;
alter table public.pois enable row level security;
alter table public.route_nodes enable row level security;
alter table public.route_edges enable row level security;
alter table public.businesses enable row level security;
alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.venue_memberships enable row level security;

-- Public discovery policies.
create policy "public can view active venues"
on public.venues for select
to anon, authenticated
using (status = 'active');

create policy "public can view public pois"
on public.pois for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1 from public.venues v
    where v.id = pois.venue_id and v.status = 'active'
  )
);

create policy "public can view active businesses"
on public.businesses for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.venues v
    where v.id = businesses.venue_id and v.status = 'active'
  )
);

create policy "public can view public events"
on public.events for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1 from public.venues v
    where v.id = events.venue_id and v.status = 'active'
  )
);

-- User can read their own profile.
create policy "users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Membership lookup is intentionally restricted to the user's own rows.
create policy "users can read own venue memberships"
on public.venue_memberships for select
to authenticated
using ((select auth.uid()) = user_id);

-- Write policies for venue-scoped administrator roles should be added only
-- after the exact management workflows are implemented and tested.
-- Do not authorize from user_metadata. Use database membership rows and/or app_metadata.

-- NOTE:
-- Production routing geometry, accessible paths, stairs, elevators and emergency
-- information must come from validated source material. Do not seed invented data.


-- Explicit Data API grants for new Supabase projects.
grant select on public.venues to anon, authenticated;
grant select on public.pois to anon, authenticated;
grant select on public.businesses to anon, authenticated;
grant select on public.events to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.venue_memberships to authenticated;

revoke all on public.organizations from anon;
revoke all on public.municipalities from anon;
revoke all on public.buildings from anon;
revoke all on public.floors from anon;
revoke all on public.spaces from anon;
revoke all on public.route_nodes from anon;
revoke all on public.route_edges from anon;
