-- Exercises the device-test claim without sending any push request.
begin;
do $$ declare
  subscription_id uuid:=gen_random_uuid(); installation_id uuid:=gen_random_uuid();
  test_endpoint text:='https://fcm.googleapis.com/fcm/send/navibori-audit-'||gen_random_uuid()::text;
  claimed integer;
begin
  insert into public.push_subscriptions(id,installation_id,endpoint,p256dh,auth,specials_enabled)
    values(subscription_id,installation_id,test_endpoint,repeat('a',87),repeat('b',22),true);
  update public.push_subscriptions set last_test_at=now()
    where id=subscription_id and push_subscriptions.installation_id=gen_random_uuid() and endpoint=test_endpoint;
  get diagnostics claimed=row_count;
  if claimed<>0 then raise exception 'AUDIT FAILED: another installation claimed the test'; end if;
  update public.push_subscriptions set last_test_at=now()
    where id=subscription_id and (last_test_at is null or last_test_at<now()-interval '60 seconds');
  get diagnostics claimed=row_count;
  if claimed<>1 then raise exception 'AUDIT FAILED: first device test was blocked'; end if;
  update public.push_subscriptions set last_test_at=now()
    where id=subscription_id and (last_test_at is null or last_test_at<now()-interval '60 seconds');
  get diagnostics claimed=row_count;
  if claimed<>0 then raise exception 'AUDIT FAILED: rapid repeated device test was allowed'; end if;
end $$;
set local role authenticated;
do $$ begin
  begin
    perform 1 from public.push_subscriptions limit 1;
    raise exception 'AUDIT FAILED: user can read subscription secrets';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: device ownership match, atomic cooldown and subscription secrecy; no push sent, fixture rolled back' as audit;
