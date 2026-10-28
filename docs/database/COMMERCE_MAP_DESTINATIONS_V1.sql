-- NAVIBORI Commerce Map Destinations V1
-- Applied to NAVIBORI Supabase on 2026-10-08.
-- Separates exterior verified routing coordinates from optional interior space geometry.

alter table public.businesses
  add column if not exists address_text text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.businesses
  drop constraint if exists businesses_latitude_check,
  drop constraint if exists businesses_longitude_check,
  drop constraint if exists businesses_route_coordinates_pair_check;

alter table public.businesses
  add constraint businesses_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint businesses_longitude_check
    check (longitude is null or longitude between -180 and 180),
  add constraint businesses_route_coordinates_pair_check
    check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null));

drop function if exists public.review_merchant_business(uuid,text,text,boolean,boolean,uuid);

create function public.review_merchant_business(
  p_business_id uuid,
  p_action text,
  p_note text default null,
  p_ownership_verified boolean default false,
  p_location_verified boolean default false,
  p_space_id uuid default null,
  p_address_text text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns public.businesses
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_business public.businesses;
  v_actor uuid := (select auth.uid());
  v_is_admin boolean := false;
  v_space_valid boolean := true;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  select * into v_business
  from public.businesses
  where id=p_business_id;

  if not found then
    raise exception 'Business not found';
  end if;

  select exists (
    select 1
    from public.venue_memberships vm
    where vm.venue_id=v_business.venue_id
      and vm.user_id=v_actor
      and vm.role in ('platform_owner','municipality_admin','venue_manager')
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Admin role required' using errcode='42501';
  end if;

  if v_business.created_by=v_actor then
    raise exception 'Reviewer cannot approve their own business' using errcode='42501';
  end if;

  if p_action='request_changes' then
    update public.businesses
    set status='draft',
        verification_status='unverified',
        review_notes=nullif(trim(coalesce(p_note,'')),''),
        reviewed_by=v_actor,
        reviewed_at=now(),
        ownership_verified=false,
        location_verified=false,
        updated_at=now()
    where id=p_business_id
    returning * into v_business;

    insert into public.audit_logs
      (action,actor_id,entity_id,entity_type,venue_id,metadata)
    values
      ('merchant_business_changes_requested',v_actor,p_business_id,'business',v_business.venue_id,
       jsonb_build_object('note',coalesce(p_note,'')));

    return v_business;
  end if;

  if p_action<>'approve' then
    raise exception 'Unsupported review action';
  end if;

  if v_business.verification_status<>'pending' then
    raise exception 'Business must be pending review';
  end if;

  if not p_ownership_verified then
    raise exception 'Ownership verification is required';
  end if;

  if not p_location_verified then
    raise exception 'Location verification is required';
  end if;

  if nullif(trim(coalesce(p_address_text,'')),'') is null then
    raise exception 'A verified public address is required';
  end if;

  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180 then
    raise exception 'Valid latitude and longitude are required';
  end if;

  if p_space_id is not null then
    select exists (
      select 1
      from public.spaces s
      join public.floors f on f.id=s.floor_id
      join public.buildings b on b.id=f.building_id
      where s.id=p_space_id
        and b.venue_id=v_business.venue_id
    ) into v_space_valid;

    if not v_space_valid then
      raise exception 'Selected space does not belong to the business venue';
    end if;
  end if;

  if not exists (
    select 1 from public.business_hours h where h.business_id=p_business_id
  ) then
    raise exception 'Business hours are required';
  end if;

  if not exists (
    select 1 from public.business_offers o where o.business_id=p_business_id
  ) then
    raise exception 'At least one offer is required';
  end if;

  update public.businesses
  set status='active',
      verification_status='verified',
      review_notes=nullif(trim(coalesce(p_note,'')),''),
      reviewed_by=v_actor,
      reviewed_at=now(),
      ownership_verified=true,
      location_verified=true,
      space_id=p_space_id,
      address_text=trim(p_address_text),
      latitude=p_latitude,
      longitude=p_longitude,
      updated_at=now()
  where id=p_business_id
  returning * into v_business;

  insert into public.audit_logs
    (action,actor_id,entity_id,entity_type,venue_id,metadata)
  values
    ('merchant_business_approved',v_actor,p_business_id,'business',v_business.venue_id,
     jsonb_build_object(
       'space_id',p_space_id,
       'ownership_verified',true,
       'location_verified',true,
       'address_text',trim(p_address_text),
       'latitude',p_latitude,
       'longitude',p_longitude,
       'note',coalesce(p_note,'')
     ));

  return v_business;
end;
$function$;

revoke execute on function public.review_merchant_business(
  uuid,text,text,boolean,boolean,uuid,text,double precision,double precision
) from public, anon;
grant execute on function public.review_merchant_business(
  uuid,text,text,boolean,boolean,uuid,text,double precision,double precision
) to authenticated, service_role;

notify pgrst, 'reload schema';
