-- NAVIBORI 3.4 — merchant promotion owner + venue membership hardening.
-- Apply to dedicated NAVIBORI Supabase project only.
-- Existing published promotions, venues and GPS content remain unchanged.
begin;

-- Explicit grants: anonymous users can read active verified promotions through
-- the existing SELECT policy, but cannot write or truncate this table.
revoke insert, update, delete, truncate, references, trigger
  on table public.business_promotions from anon;
revoke truncate, references, trigger
  on table public.business_promotions from authenticated;
grant select, insert, update, delete
  on table public.business_promotions to authenticated;
grant select on table public.business_promotions to anon;

alter table public.business_promotions enable row level security;
drop policy if exists "owners can manage business promotions"
  on public.business_promotions;
create policy "owners with current venue membership manage promotions"
on public.business_promotions
for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    join public.venue_memberships vm
      on vm.venue_id=b.venue_id
     and vm.user_id=(select auth.uid())
     and vm.role in ('merchant','platform_owner','municipality_admin','venue_manager')
    where b.id=business_promotions.business_id
      and b.created_by=(select auth.uid())
      and b.status in ('draft','active')
      and (b.status='active' or b.verification_status<>'pending')
  )
)
with check (
  exists (
    select 1 from public.businesses b
    join public.venue_memberships vm
      on vm.venue_id=b.venue_id
     and vm.user_id=(select auth.uid())
     and vm.role in ('merchant','platform_owner','municipality_admin','venue_manager')
    where b.id=business_promotions.business_id
      and b.created_by=(select auth.uid())
      and b.status in ('draft','active')
      and (b.status='active' or b.verification_status<>'pending')
  )
);

-- Existing sync entry point must not wipe promotions managed independently.
-- No promotions argument (NULL) means "leave promotions as they are".
-- An explicitly supplied JSON array still performs the legacy replacement.
create or replace function public.sync_merchant_business_content(
  p_business_id uuid,
  p_hours jsonb default '[]'::jsonb,
  p_offers jsonb default '[]'::jsonb,
  p_promotions jsonb default null
)
returns boolean
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_status text;
  v_business record;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  select b.status,b.verification_status,b.venue_id
  into v_business
  from public.businesses b
  where b.id=p_business_id
    and b.created_by=(select auth.uid())
    and b.status in ('draft','active')
    and (b.status='active' or b.verification_status<>'pending')
    and exists (
      select 1 from public.venue_memberships vm
      where vm.venue_id=b.venue_id
        and vm.user_id=(select auth.uid())
        and vm.role in ('merchant','platform_owner','municipality_admin','venue_manager')
    );
  if not found then
    raise exception 'Business ownership and current venue membership required'
      using errcode='42501';
  end if;
  v_status:=v_business.status;

  delete from public.business_hours where business_id=p_business_id;
  insert into public.business_hours(business_id,day_of_week,opens,closes,closed)
  select p_business_id,x.day_of_week,x.opens,x.closes,coalesce(x.closed,false)
  from jsonb_to_recordset(coalesce(p_hours,'[]'::jsonb))
    as x(day_of_week smallint,opens time,closes time,closed boolean);

  delete from public.business_offers where business_id=p_business_id;
  insert into public.business_offers
    (business_id,title,description,price,currency,featured,available,sku,sort_order)
  select p_business_id,trim(x.title),
    nullif(trim(coalesce(x.description,'')),''),
    x.price,'USD',coalesce(x.featured,false),coalesce(x.available,true),
    nullif(trim(coalesce(x.sku,'')),''),
    coalesce(x.sort_order,0)
  from jsonb_to_recordset(coalesce(p_offers,'[]'::jsonb))
    as x(title text,description text,price numeric,featured boolean,
         available boolean,sku text,sort_order integer)
  where length(trim(coalesce(x.title,'')))>0;

  if p_promotions is not null then
    if jsonb_typeof(p_promotions)<>'array' then
      raise exception 'Promotions must be an array' using errcode='22023';
    end if;
    delete from public.business_promotions where business_id=p_business_id;
    insert into public.business_promotions
      (business_id,title,description,starts_at,ends_at,active)
    select p_business_id,trim(x.title),coalesce(x.description,''),
      x.starts_at,x.ends_at,coalesce(x.active,true)
    from jsonb_to_recordset(p_promotions)
      as x(title text,description text,starts_at timestamptz,
           ends_at timestamptz,active boolean)
    where length(trim(coalesce(x.title,'')))>0;
  end if;

  update public.businesses set updated_at=now() where id=p_business_id;

  insert into public.audit_logs
    (action,actor_id,entity_id,entity_type,venue_id,metadata)
  values (
    case when v_status='active' then
      'merchant_business_operations_updated'
    else 'merchant_business_draft_content_updated' end,
    (select auth.uid()),p_business_id,'business',v_business.venue_id,
    jsonb_build_object(
      'hours_count',jsonb_array_length(coalesce(p_hours,'[]'::jsonb)),
      'offers_count',jsonb_array_length(coalesce(p_offers,'[]'::jsonb)),
      'promotions_replaced',p_promotions is not null
    )
  );
  return true;
end;
$$;

-- Audit individual promotion changes without exposing admin credentials.
create or replace function public.audit_merchant_promotion_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_business_id uuid;
  v_venue_id uuid;
  v_promotion_id uuid;
begin
  v_business_id:=case when TG_OP='DELETE' then OLD.business_id else NEW.business_id end;
  v_promotion_id:=case when TG_OP='DELETE' then OLD.id else NEW.id end;
  select b.venue_id into v_venue_id
  from public.businesses b where b.id=v_business_id;

  insert into public.audit_logs
    (action,actor_id,entity_id,entity_type,venue_id,metadata)
  values (
    'merchant_promotion_'||lower(TG_OP),
    (select auth.uid()),v_promotion_id,'business_promotion',v_venue_id,
    jsonb_build_object('business_id',v_business_id)
  );
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function public.audit_merchant_promotion_change() from public;
drop trigger if exists navibori_audit_promotion_write
  on public.business_promotions;
create trigger navibori_audit_promotion_write
after insert or update or delete
on public.business_promotions
for each row execute function public.audit_merchant_promotion_change();

commit;
