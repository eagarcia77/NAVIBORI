-- Transactional integration test. All users, venues, businesses and logs roll back.
begin;
create temporary table audit_fixtures as select gen_random_uuid() as owner_id,gen_random_uuid() as foreign_id,
  gen_random_uuid() as reviewer_id,gen_random_uuid() as unconfirmed_id,gen_random_uuid() as venue_id;
grant select on audit_fixtures to authenticated,anon;
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','navibori-audit-'||id::text||'@example.invalid',
  case when id=f.unconfirmed_id then null else now() end,now(),now()
from audit_fixtures f cross join lateral unnest(array[f.owner_id,f.foreign_id,f.reviewer_id,f.unconfirmed_id]) id;
insert into public.venues(id,municipality_id,name,slug,status)
select f.venue_id,v.municipality_id,'AUDIT rollback fixture','audit-'||f.venue_id::text,'draft'
from audit_fixtures f cross join lateral(select municipality_id from public.venues limit 1)v;
insert into public.venue_memberships(user_id,venue_id,role) select reviewer_id,venue_id,'venue_manager' from audit_fixtures;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',unconfirmed_id,'role','authenticated')::text,true) from audit_fixtures;
do $$ begin
  begin
    perform public.register_merchant_business((select venue_id from audit_fixtures),'Audit negocio','servicios','Descripción de prueba completa','7875551234');
    raise exception 'AUDIT FAILED: unconfirmed enrollment allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true) from audit_fixtures;
do $$ declare v uuid; again uuid; n integer; begin
  select public.register_merchant_business((select venue_id from audit_fixtures),'Audit negocio','servicios','Descripción de prueba completa','7875551234','+17875551234') into v;
  select public.register_merchant_business((select venue_id from audit_fixtures),'Audit negocio','servicios','Descripción de prueba completa','7875551234') into again;
  if v<>again then raise exception 'AUDIT FAILED: duplicate enrollment'; end if;
  begin
    update public.businesses set location_verified=true where id=v;
    raise exception 'AUDIT FAILED: owner self-verification allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.business_promotions(business_id,title,description,active) values(v,'Audit offer','Draft only',true);
    raise exception 'AUDIT FAILED: unverified ad activation allowed';
  exception when insufficient_privilege then null; end;
  insert into public.business_promotions(business_id,title,description,active) values(v,'Audit offer','Draft only',false);
  perform public.sync_merchant_business_content(v,'[{"day_of_week":1,"opens":"09:00","closes":"17:00","closed":false}]'::jsonb,
    '[{"title":"Servicio","price":10,"available":true}]'::jsonb,null);
  insert into public.business_media(business_id,created_by,kind,storage_path,alt_text) values(v,auth.uid(),'logo',v::text||'/audit.webp','Audit logo');
  perform public.submit_merchant_business_for_review(v);
  update public.business_media set alt_text='ILLEGAL pending logo edit' where business_id=v;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'AUDIT FAILED: pending image editable'; end if;
  update public.businesses set name='ILLEGAL pending edit' where id=v;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'AUDIT FAILED: pending draft editable'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',foreign_id,'role','authenticated')::text,true) from audit_fixtures;
do $$ declare n integer; begin
  update public.business_promotions set title='ILLEGAL foreign edit' where title='Audit offer';
  get diagnostics n=row_count;
  if n<>0 then raise exception 'AUDIT FAILED: foreign ad editable'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',reviewer_id,'role','authenticated')::text,true) from audit_fixtures;
do $$ declare v uuid; begin
  select b.id into v from public.businesses b join audit_fixtures f on b.created_by=f.owner_id;
  perform public.review_merchant_business(v,'approve','Audit rollback',true,true,null,'Audit address',18,-66);
end $$;
select set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true) from audit_fixtures;
do $$ declare n integer; begin
  update public.business_promotions set active=true where title='Audit offer';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'AUDIT FAILED: verified owner cannot activate'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare n integer; begin
  select count(*) into n from public.businesses b join audit_fixtures f on b.venue_id=f.venue_id;
  if n<>1 then raise exception 'AUDIT FAILED: verified exterior destination hidden by indoor draft'; end if;
  begin
    perform public.register_merchant_business((select venue_id from audit_fixtures),'Audit negocio','servicios','Descripción de prueba completa','7875551234');
    raise exception 'AUDIT FAILED: anonymous registration allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from public.venue_memberships where user_id=(select owner_id from audit_fixtures);
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true) from audit_fixtures;
do $$ declare n integer; begin
  begin
    perform public.register_merchant_business((select venue_id from audit_fixtures),'Audit negocio','servicios','Descripción de prueba completa','7875551234');
    raise exception 'AUDIT FAILED: revoked access recovered by registration';
  exception when insufficient_privilege then null; end;
  update public.business_promotions set active=false where title='Audit offer';
  get diagnostics n=row_count;
  if n<>0 then raise exception 'AUDIT FAILED: revoked owner can edit ad'; end if;
  update public.business_media set alt_text='ILLEGAL revoked image' where created_by=(select owner_id from audit_fixtures);
  get diagnostics n=row_count;
  if n<>0 then raise exception 'AUDIT FAILED: revoked owner can edit image'; end if;
end $$;
reset role;
rollback;
select 'PASS: enrollment, idempotency, confirmation, review, ownership, publication and revocation; fixtures rolled back' as audit;
