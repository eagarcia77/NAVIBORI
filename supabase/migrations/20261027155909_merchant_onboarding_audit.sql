-- Self-enrollment creates only a private draft and a merchant membership.
-- It cannot publish, claim another business, or recover a revoked membership.
create table navibori_private.merchant_enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(user_id,venue_id)
);
alter table navibori_private.merchant_enrollments enable row level security;
revoke all on navibori_private.merchant_enrollments from public,anon,authenticated;
create index merchant_enrollments_venue_idx on navibori_private.merchant_enrollments(venue_id);
create index merchant_enrollments_business_idx on navibori_private.merchant_enrollments(business_id);

create function navibori_private.merchant_registration_venues()
returns table(id uuid,name text,status text)
language plpgsql stable security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'Sesión requerida.' using errcode='42501'; end if;
  return query select v.id,v.name,v.status from public.venues v
    where v.status in ('draft','active') order by v.name limit 100;
end $$;

create function public.merchant_registration_venues()
returns table(id uuid,name text,status text)
language sql stable security invoker set search_path=''
as $$ select * from navibori_private.merchant_registration_venues() $$;

create function navibori_private.register_merchant_business(
  p_venue_id uuid,p_name text,p_category text,p_description text,
  p_phone text default '',p_whatsapp text default '',p_website text default '',p_address text default ''
) returns uuid language plpgsql security definer set search_path=''
as $$
declare
  actor uuid:=auth.uid(); existing uuid; business_id uuid:=gen_random_uuid();
  whatsapp text:=regexp_replace(coalesce(p_whatsapp,''),'[[:space:]()-]','','g');
begin
  if actor is null or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null) then
    raise exception 'Confirma tu correo e inicia sesión para registrar el comercio.' using errcode='42501';
  end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 120
    or p_description is null or length(btrim(p_description)) not between 10 and 2000
    or p_category is null or p_category not in ('gastronomia','compras','servicios','artesania','bienestar','otros')
    or length(coalesce(p_phone,''))>40 or length(coalesce(p_website,''))>2048
    or length(coalesce(p_address,''))>500
    or (whatsapp<>'' and whatsapp !~ '^[+]?[1-9][0-9]{7,14}$')
    or (coalesce(p_website,'')<>'' and p_website !~* '^https?://[^[:space:]]+$')
    or (btrim(coalesce(p_phone,''))='' and whatsapp='' and btrim(coalesce(p_website,''))='') then
    raise exception 'Revisa nombre, descripción y al menos un medio de contacto válido.' using errcode='22023';
  end if;
  if not exists(select 1 from public.venues v where v.id=p_venue_id and v.status in ('draft','active')) then
    raise exception 'Selecciona un recinto disponible.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_venue_id::text,0));
  select e.business_id into existing from navibori_private.merchant_enrollments e where e.user_id=actor and e.venue_id=p_venue_id;
  if found then
    if existing is null or not exists(select 1 from public.venue_memberships m where m.user_id=actor and m.venue_id=p_venue_id
      and m.role in ('merchant','platform_owner','municipality_admin','venue_manager')) then
      raise exception 'El acceso fue retirado. Solicita revisión al administrador.' using errcode='42501';
    end if;
    return existing;
  end if;
  select b.id into existing from public.businesses b where b.created_by=actor and b.venue_id=p_venue_id order by b.created_at limit 1;
  if found then
    if not exists(select 1 from public.venue_memberships m where m.user_id=actor and m.venue_id=p_venue_id
      and m.role in ('merchant','platform_owner','municipality_admin','venue_manager')) then
      raise exception 'Solicita al administrador que revise tu acceso.' using errcode='42501';
    end if;
    insert into navibori_private.merchant_enrollments values(actor,p_venue_id,existing,now());
    return existing;
  end if;
  insert into public.venue_memberships(user_id,venue_id,role) values(actor,p_venue_id,'merchant') on conflict do nothing;
  insert into public.businesses(id,venue_id,created_by,name,slug,category,description,phone,whatsapp,website,address_text)
  values(business_id,p_venue_id,actor,btrim(p_name),
    coalesce(nullif(btrim(regexp_replace(lower(btrim(p_name)),'[^a-z0-9]+','-','g'),'-'),''),'comercio')||'-'||left(business_id::text,8),
    p_category,btrim(p_description),nullif(btrim(p_phone),''),nullif(whatsapp,''),nullif(btrim(p_website),''),nullif(btrim(p_address),''));
  insert into navibori_private.merchant_enrollments values(actor,p_venue_id,business_id,now());
  insert into public.audit_logs(action,actor_id,entity_type,entity_id,venue_id,metadata)
    values('merchant_self_registered',actor,'business',business_id,p_venue_id,'{"publication":"review_required"}'::jsonb);
  return business_id;
end $$;

create function public.register_merchant_business(
  p_venue_id uuid,p_name text,p_category text,p_description text,
  p_phone text default '',p_whatsapp text default '',p_website text default '',p_address text default ''
) returns uuid language sql volatile security invoker set search_path=''
as $$ select navibori_private.register_merchant_business(p_venue_id,p_name,p_category,p_description,p_phone,p_whatsapp,p_website,p_address) $$;

revoke all on function navibori_private.merchant_registration_venues() from public,anon;
revoke all on function public.merchant_registration_venues() from public,anon;
revoke all on function navibori_private.register_merchant_business(uuid,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.register_merchant_business(uuid,text,text,text,text,text,text,text) from public,anon;
grant execute on function navibori_private.merchant_registration_venues(),public.merchant_registration_venues() to authenticated;
grant execute on function navibori_private.register_merchant_business(uuid,text,text,text,text,text,text,text),
  public.register_merchant_business(uuid,text,text,text,text,text,text,text) to authenticated;

-- Freeze pending drafts at the database, including direct REST updates.
drop policy "merchants can update own business drafts" on public.businesses;
create policy "merchants can update own business drafts" on public.businesses for update to authenticated
using(created_by=(select auth.uid()) and status='draft' and verification_status<>'pending'
  and navibori_private.has_venue_role(venue_id,array['merchant','platform_owner','municipality_admin','venue_manager']))
with check(created_by=(select auth.uid()) and status='draft' and verification_status in ('unverified','pending')
  and navibori_private.has_venue_role(venue_id,array['merchant','platform_owner','municipality_admin','venue_manager']));

create function navibori_private.guard_merchant_business_identity()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if auth.uid() is not null and old.created_by=auth.uid() and (
    new.created_by is distinct from old.created_by or new.venue_id is distinct from old.venue_id or
    new.status is distinct from old.status or new.ownership_verified is distinct from old.ownership_verified or
    new.location_verified is distinct from old.location_verified or new.reviewed_by is distinct from old.reviewed_by or
    new.reviewed_at is distinct from old.reviewed_at or new.review_notes is distinct from old.review_notes or
    new.space_id is distinct from old.space_id or new.verification_status='verified' and old.verification_status<>'verified'
  ) then raise exception 'La titularidad y verificación requieren un revisor independiente.' using errcode='42501'; end if;
  return new;
end $$;
revoke all on function navibori_private.guard_merchant_business_identity() from public,anon,authenticated;
create trigger guard_merchant_business_identity before update on public.businesses
  for each row execute function navibori_private.guard_merchant_business_identity();

-- Verified exterior business destinations are independent of unpublished indoor geometry.
drop policy "public can view active businesses" on public.businesses;
create policy "public can view active businesses" on public.businesses for select to anon,authenticated
using(status='active' and verification_status='verified' and ownership_verified and location_verified
  and latitude between -90 and 90 and longitude between -180 and 180);

-- A draft owner cannot pre-set protected fields at INSERT through the REST API.
drop policy "merchants can create own business drafts" on public.businesses;
create policy "merchants can create own business drafts" on public.businesses for insert to authenticated
with check(status='draft' and verification_status='unverified' and not ownership_verified and not location_verified
  and reviewed_by is null and reviewed_at is null and created_by=(select auth.uid())
  and navibori_private.has_venue_role(venue_id,array['merchant','platform_owner','municipality_admin','venue_manager']));

alter table public.businesses drop constraint businesses_whatsapp_check;
alter table public.businesses add constraint businesses_whatsapp_check
  check(whatsapp is null or whatsapp ~ '^[+]?[1-9][0-9]{7,14}$');
