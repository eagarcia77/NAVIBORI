-- NAVIBORI Commerce Fulfillment Progress V1
-- Applied to the dedicated NAVIBORI Supabase project on 2026-10-08.
-- Adds accepted -> preparing -> ready -> completed while preserving
-- cancellation/no-show and slot-capacity truth.

alter table public.business_customer_requests
  add column if not exists estimated_ready_at timestamptz,
  add column if not exists preparation_started_at timestamptz,
  add column if not exists ready_at timestamptz;

alter table public.business_customer_requests
  drop constraint if exists business_customer_requests_status_check;

alter table public.business_customer_requests
  add constraint business_customer_requests_status_check
  check (status in (
    'new','accepted','preparing','ready','completed','cancelled','no_show'
  ));

drop policy if exists "availability rpc can count active requests"
  on public.business_customer_requests;

create policy "availability rpc can count active requests"
on public.business_customer_requests
for select
to anon, authenticated
using (
  current_setting('navibori.availability_read', true) = '1'
  and status in ('new','accepted','preparing','ready')
  and requested_for is not null
  and fulfillment_method in ('pickup','reservation')
  and exists (
    select 1 from public.businesses b
    where b.id = business_customer_requests.business_id
      and b.status = 'active'
  )
);

drop policy if exists "request status rpc can update owned request"
  on public.business_customer_requests;

create policy "request status rpc can update owned request"
on public.business_customer_requests
for update
to authenticated
using (
  current_setting('navibori.request_status_write', true) = '1'
  and exists (
    select 1 from public.businesses b
    where b.id = business_customer_requests.business_id
      and b.created_by = (select auth.uid())
  )
)
with check (
  current_setting('navibori.request_status_write', true) = '1'
  and status in ('accepted','preparing','ready','completed','cancelled','no_show')
  and exists (
    select 1 from public.businesses b
    where b.id = business_customer_requests.business_id
      and b.created_by = (select auth.uid())
  )
);

create or replace function public.update_business_customer_request_status(
  p_request_id uuid,
  p_status text
)
returns public.business_customer_requests
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_request public.business_customer_requests;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if p_status not in ('accepted','preparing','ready','completed','cancelled','no_show') then
    raise exception 'Unsupported request status';
  end if;

  select r.* into v_request
  from public.business_customer_requests r
  join public.businesses b on b.id=r.business_id
  where r.id=p_request_id
    and b.created_by=(select auth.uid());

  if not found then
    raise exception 'Request not found or not owned by current merchant'
      using errcode='42501';
  end if;

  if v_request.status in ('completed','cancelled','no_show') then
    raise exception 'Closed request cannot be changed';
  end if;

  if v_request.status='new' and p_status not in ('accepted','cancelled') then
    raise exception 'New request must be accepted before fulfillment';
  end if;

  if v_request.status='accepted'
     and p_status not in ('preparing','ready','completed','cancelled','no_show') then
    raise exception 'Unsupported transition';
  end if;

  if v_request.status='preparing'
     and p_status not in ('ready','completed','cancelled') then
    raise exception 'Unsupported transition';
  end if;

  if v_request.status='ready'
     and p_status not in ('completed','cancelled','no_show') then
    raise exception 'Unsupported transition';
  end if;

  if p_status='no_show' then
    if v_request.requested_for is null then
      raise exception 'No-show requires a scheduled request';
    end if;
    if v_request.requested_for > now() then
      raise exception 'Cannot mark no-show before scheduled time';
    end if;
  end if;

  perform set_config('navibori.request_status_write','1',true);

  update public.business_customer_requests
  set status=p_status,
      preparation_started_at=case
        when p_status in ('preparing','ready')
          then coalesce(preparation_started_at,now())
        else preparation_started_at
      end,
      ready_at=case
        when p_status in ('ready','completed')
          then coalesce(ready_at,now())
        else ready_at
      end,
      updated_at=now()
  where id=p_request_id
  returning * into v_request;

  return v_request;
end;
$function$;

create or replace function public.set_business_customer_request_estimate(
  p_request_id uuid,
  p_estimated_ready_at timestamptz
)
returns public.business_customer_requests
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_request public.business_customer_requests;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  if p_estimated_ready_at is not null
     and (p_estimated_ready_at < now()
       or p_estimated_ready_at > now() + interval '7 days') then
    raise exception 'Estimated ready time is outside the allowed window';
  end if;

  select r.* into v_request
  from public.business_customer_requests r
  join public.businesses b on b.id=r.business_id
  where r.id=p_request_id
    and b.created_by=(select auth.uid());

  if not found then
    raise exception 'Request not found or not owned by current merchant'
      using errcode='42501';
  end if;

  if v_request.status not in ('accepted','preparing') then
    raise exception 'Estimate can only be set for accepted or preparing requests';
  end if;

  perform set_config('navibori.request_status_write','1',true);

  update public.business_customer_requests
  set estimated_ready_at=p_estimated_ready_at,
      updated_at=now()
  where id=p_request_id
  returning * into v_request;

  return v_request;
end;
$function$;

revoke execute on function public.set_business_customer_request_estimate(uuid,timestamptz)
  from public, anon;
grant execute on function public.set_business_customer_request_estimate(uuid,timestamptz)
  to authenticated;

drop policy if exists "customer token can view request"
  on public.business_customer_requests;

create policy "customer token can view request"
on public.business_customer_requests
for select
to anon, authenticated
using (
  current_setting('navibori.customer_status_read', true) = '1'
  and customer_cancel_token_hash is not null
  and customer_cancel_token_hash =
    current_setting('navibori.customer_status_hash', true)
);

create or replace function public.get_customer_business_request_status(
  p_request_id uuid,
  p_cancel_token text
)
returns table(
  id uuid,
  business_name text,
  status text,
  fulfillment_method text,
  requested_for timestamptz,
  estimated_ready_at timestamptz,
  preparation_started_at timestamptz,
  ready_at timestamptz,
  updated_at timestamptz,
  customer_cancelled_at timestamptz
)
language plpgsql
set search_path to 'public','extensions','pg_temp'
as $function$
declare
  v_hash text;
begin
  if p_cancel_token is null or p_cancel_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  v_hash := encode(digest(p_cancel_token,'sha256'),'hex');
  perform set_config('navibori.customer_status_read','1',true);
  perform set_config('navibori.customer_status_hash',v_hash,true);

  return query
  select r.id,b.name,r.status,r.fulfillment_method,r.requested_for,
         r.estimated_ready_at,r.preparation_started_at,r.ready_at,
         r.updated_at,r.customer_cancelled_at
  from public.business_customer_requests r
  join public.businesses b on b.id=r.business_id
  where r.id=p_request_id;
end;
$function$;

revoke execute on function public.get_customer_business_request_status(uuid,text)
  from public;
grant execute on function public.get_customer_business_request_status(uuid,text)
  to anon, authenticated;

-- Keep preparing/ready requests consuming fulfillment capacity.
do $migration$
declare v_def text; v_next text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_business_fulfillment_slots'
  limit 1;

  v_next := replace(v_def,
    $$r.status in ('new','accepted')$$,
    $$r.status in ('new','accepted','preparing','ready')$$);

  if v_next = v_def then
    raise exception 'Could not update get_business_fulfillment_slots';
  end if;
  execute v_next;
end;
$migration$;

do $migration$
declare v_def text; v_next text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='create_business_customer_request'
  limit 1;

  v_next := replace(v_def,
    $$r.status in ('new','accepted')$$,
    $$r.status in ('new','accepted','preparing','ready')$$);

  if v_next = v_def then
    raise exception 'Could not update create_business_customer_request';
  end if;
  execute v_next;
end;
$migration$;

notify pgrst, 'reload schema';
