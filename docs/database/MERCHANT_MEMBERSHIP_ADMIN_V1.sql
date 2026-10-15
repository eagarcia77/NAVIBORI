-- NAVIBORI 3.5: limited merchant membership administration.
-- Only pre-existing venue admins can grant/revoke the MERCHANT role.
-- Deliberately does not bootstrap a platform owner or grant admin roles.
begin;

create or replace function public.list_merchant_venue_access(p_venue_id uuid)
returns table(user_id uuid, email text, created_at timestamptz)
language plpgsql stable security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.venue_memberships vm
    where vm.user_id=(select auth.uid()) and vm.venue_id=p_venue_id
      and vm.role in ('platform_owner','municipality_admin','venue_manager')
  ) then
    raise exception 'Administrator membership required for this venue'
      using errcode='42501';
  end if;

  return query
    select vm.user_id,u.email::text,vm.created_at
    from public.venue_memberships vm
    join auth.users u on u.id=vm.user_id
    where vm.venue_id=p_venue_id and vm.role='merchant'
    order by vm.created_at desc;
end;
$$;

create or replace function public.grant_merchant_venue_access(
  p_venue_id uuid,p_email text
) returns boolean
language plpgsql volatile security definer
set search_path=''
as $$
declare
  v_actor uuid:=(select auth.uid());
  v_target uuid;
  v_added uuid;
  v_email text:=lower(btrim(coalesce(p_email,'')));
begin
  if v_actor is null or not exists (
    select 1 from public.venue_memberships vm
    where vm.venue_id=p_venue_id and vm.user_id=v_actor
      and vm.role in ('platform_owner','municipality_admin','venue_manager')
  ) then
    raise exception 'Administrator membership required for this venue'
      using errcode='42501';
  end if;

  if char_length(v_email)<5 or char_length(v_email)>254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  then
    raise exception 'A valid email address is required' using errcode='22023';
  end if;

  select u.id into v_target
  from auth.users u
  where lower(u.email)=v_email and u.email_confirmed_at is not null
  limit 1;
  if v_target is null then
    raise exception 'An existing account with a confirmed email is required'
      using errcode='22023';
  end if;
  if v_target=v_actor then
    raise exception 'An administrator cannot grant their own merchant role'
      using errcode='42501';
  end if;

  insert into public.venue_memberships(user_id,venue_id,role)
    values(v_target,p_venue_id,'merchant')
    on conflict (user_id,venue_id,role) do nothing
    returning user_id into v_added;

  if v_added is not null then
    insert into public.audit_logs
      (action,actor_id,entity_type,entity_id,venue_id,metadata)
    values
      ('merchant_venue_access_granted',v_actor,'venue_membership',
       v_target,p_venue_id,'{"role":"merchant"}'::jsonb);
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.revoke_merchant_venue_access(
  p_venue_id uuid,p_user_id uuid
) returns boolean
language plpgsql volatile security definer
set search_path=''
as $$
declare
  v_actor uuid:=(select auth.uid());
  v_deleted uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.venue_memberships vm
    where vm.venue_id=p_venue_id and vm.user_id=v_actor
      and vm.role in ('platform_owner','municipality_admin','venue_manager')
  ) then
    raise exception 'Administrator membership required for this venue'
      using errcode='42501';
  end if;
  if v_actor=p_user_id then
    raise exception 'Administrators cannot revoke their own access'
      using errcode='42501';
  end if;

  delete from public.venue_memberships vm
  where vm.venue_id=p_venue_id and vm.user_id=p_user_id
    and vm.role='merchant'
  returning vm.user_id into v_deleted;

  if v_deleted is not null then
    insert into public.audit_logs
      (action,actor_id,entity_type,entity_id,venue_id,metadata)
    values
      ('merchant_venue_access_revoked',v_actor,'venue_membership',
       p_user_id,p_venue_id,'{"role":"merchant"}'::jsonb);
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.list_merchant_venue_access(uuid) from public,anon;
revoke all on function public.grant_merchant_venue_access(uuid,text) from public,anon;
revoke all on function public.revoke_merchant_venue_access(uuid,uuid) from public,anon;
grant execute on function public.list_merchant_venue_access(uuid) to authenticated;
grant execute on function public.grant_merchant_venue_access(uuid,text) to authenticated;
grant execute on function public.revoke_merchant_venue_access(uuid,uuid) to authenticated;

commit;
