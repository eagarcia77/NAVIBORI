-- NAVIBORI 3.5 security follow-up:
-- Privileged code lives in navibori_private; the exposed public RPCs
-- are SECURITY INVOKER, and therefore cannot elevate by themselves.
begin;

alter function public.list_merchant_venue_access(uuid)
  set schema navibori_private;
alter function public.grant_merchant_venue_access(uuid,text)
  set schema navibori_private;
alter function public.revoke_merchant_venue_access(uuid,uuid)
  set schema navibori_private;

-- navibori_private already grants authenticated USAGE for other
-- venue-secured RPC helpers. Do not expose that schema in PostgREST.
revoke all on function navibori_private.list_merchant_venue_access(uuid)
  from public,anon;
revoke all on function navibori_private.grant_merchant_venue_access(uuid,text)
  from public,anon;
revoke all on function navibori_private.revoke_merchant_venue_access(uuid,uuid)
  from public,anon;
grant execute on function navibori_private.list_merchant_venue_access(uuid)
  to authenticated;
grant execute on function navibori_private.grant_merchant_venue_access(uuid,text)
  to authenticated;
grant execute on function navibori_private.revoke_merchant_venue_access(uuid,uuid)
  to authenticated;

create function public.list_merchant_venue_access(p_venue_id uuid)
returns table(user_id uuid,email text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $$
  select m.user_id,m.email,m.created_at
  from navibori_private.list_merchant_venue_access(p_venue_id) m
$$;

create function public.grant_merchant_venue_access(
  p_venue_id uuid,p_email text
) returns boolean
language sql volatile security invoker set search_path=''
as $$
  select navibori_private.grant_merchant_venue_access(p_venue_id,p_email)
$$;

create function public.revoke_merchant_venue_access(
  p_venue_id uuid,p_user_id uuid
) returns boolean
language sql volatile security invoker set search_path=''
as $$
  select navibori_private.revoke_merchant_venue_access(p_venue_id,p_user_id)
$$;

revoke all on function public.list_merchant_venue_access(uuid)
  from public,anon;
revoke all on function public.grant_merchant_venue_access(uuid,text)
  from public,anon;
revoke all on function public.revoke_merchant_venue_access(uuid,uuid)
  from public,anon;
grant execute on function public.list_merchant_venue_access(uuid)
  to authenticated;
grant execute on function public.grant_merchant_venue_access(uuid,text)
  to authenticated;
grant execute on function public.revoke_merchant_venue_access(uuid,uuid)
  to authenticated;

commit;
