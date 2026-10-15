-- NAVIBORI Commerce Push Notifications V1
-- Production schema reference. Never commit the VAPID private key.
-- The private key is stored in Supabase Vault and is readable only by service_role
-- through public.get_navibori_vapid_private(), whose EXECUTE privilege is revoked
-- from PUBLIC, anon and authenticated.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  specials_enabled boolean not null default true,
  user_id uuid null references auth.users(id) on delete set null,
  user_agent text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_subscriptions_installation_endpoint_unique
    unique (installation_id,endpoint),
  constraint push_subscriptions_endpoint_length
    check (length(endpoint) between 20 and 2048),
  constraint push_subscriptions_p256dh_length
    check (length(p256dh) between 20 and 512),
  constraint push_subscriptions_auth_length
    check (length(auth) between 8 and 256)
);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;

drop policy if exists "push subscriptions deny direct clients"
  on public.push_subscriptions;
create policy "push subscriptions deny direct clients"
on public.push_subscriptions
for all
to anon, authenticated
using (false)
with check (false);

create table if not exists public.promotion_push_dispatches (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null unique
    references public.business_promotions(id) on delete cascade,
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  dispatch_kind text not null
    check (dispatch_kind in ('manual','scheduled')),
  status text not null default 'sending'
    check (status in ('sending','sent','partial','failed')),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  error_message text null
);

alter table public.promotion_push_dispatches enable row level security;
revoke all on table public.promotion_push_dispatches from anon, authenticated;

drop policy if exists "push dispatches deny direct clients"
  on public.promotion_push_dispatches;
create policy "push dispatches deny direct clients"
on public.promotion_push_dispatches
for all
to anon, authenticated
using (false)
with check (false);

create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions (specials_enabled)
  where specials_enabled=true;

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create index if not exists promotion_push_dispatches_business_id_idx
  on public.promotion_push_dispatches(business_id);

create index if not exists promotion_push_dispatches_created_by_idx
  on public.promotion_push_dispatches(created_by);

create index if not exists business_promotions_push_due_idx
  on public.business_promotions (starts_at)
  where active=true;

-- One-time production secret setup:
-- select vault.create_secret('<VAPID_PRIVATE_PKCS8_BASE64>',
--                            'navibori_vapid_private_pkcs8');

create or replace function public.get_navibori_vapid_private()
returns text
language sql
security definer
set search_path = public, vault, pg_temp
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='navibori_vapid_private_pkcs8'
  limit 1;
$$;

revoke all on function public.get_navibori_vapid_private() from public;
revoke all on function public.get_navibori_vapid_private() from anon;
revoke all on function public.get_navibori_vapid_private() from authenticated;
grant execute on function public.get_navibori_vapid_private() to service_role;

-- Schedule after deploying supabase/functions/push-promotion-cron.
-- Replace the project URL and publishable key with the deployment values.
--
-- select cron.schedule(
--   'navibori-promotion-push-10m',
--   '*/10 * * * *',
--   $job$
--   select net.http_post(
--     url := '<SUPABASE_PROJECT_URL>/functions/v1/push-promotion-cron',
--     headers := jsonb_build_object(
--       'Content-Type','application/json',
--       'apikey','<SUPABASE_PUBLISHABLE_KEY>'
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 8000
--   );
--   $job$
-- );
