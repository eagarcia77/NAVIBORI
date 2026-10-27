-- Authenticate the scheduled sender with a server-only Vault secret.
do $$ begin
  if not exists(select 1 from vault.secrets where name='navibori_push_cron_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'navibori_push_cron_token');
  end if;
end $$;
create function navibori_private.get_push_cron_token() returns text
language sql stable security definer set search_path=''
as $$ select decrypted_secret from vault.decrypted_secrets where name='navibori_push_cron_token' limit 1 $$;
revoke all on function navibori_private.get_push_cron_token() from public,anon,authenticated;
grant usage on schema navibori_private to service_role;
grant execute on function navibori_private.get_push_cron_token() to service_role;
create function public.get_navibori_push_cron_token() returns text
language sql stable security invoker set search_path=''
as $$ select navibori_private.get_push_cron_token() $$;
revoke all on function public.get_navibori_push_cron_token() from public,anon,authenticated;
grant execute on function public.get_navibori_push_cron_token() to service_role;

-- Anti-join prevents already-sent old offers from starving new scheduled offers.
create function public.due_promotion_pushes() returns setof public.business_promotions
language sql stable security invoker set search_path=''
as $$
  select p.* from public.business_promotions p join public.businesses b on b.id=p.business_id
  where p.active and (p.starts_at is null or p.starts_at<=now()) and (p.ends_at is null or p.ends_at>now())
    and b.status='active' and b.verification_status='verified' and b.location_verified and b.ownership_verified
    and not exists(select 1 from public.promotion_push_dispatches d where d.promotion_id=p.id)
  order by coalesce(p.starts_at,p.created_at) limit 10
$$;
revoke all on function public.due_promotion_pushes() from public,anon,authenticated;
grant execute on function public.due_promotion_pushes() to service_role;

do $$ declare job_id bigint; begin
  select jobid into job_id from cron.job where jobname='navibori-promotion-push-10m';
  if job_id is not null then
    perform cron.alter_job(job_id,command := $job$
      select net.http_post(
        url:='https://dwvmkmdrekovuckcyvfq.supabase.co/functions/v1/push-promotion-cron',
        headers:=jsonb_build_object('Content-Type','application/json','x-navibori-cron-token',
          (select decrypted_secret from vault.decrypted_secrets where name='navibori_push_cron_token' limit 1)),
        body:='{}'::jsonb,timeout_milliseconds:=8000
      );
    $job$);
  end if;
end $$;
