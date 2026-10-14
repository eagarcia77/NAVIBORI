-- NAVIBORI 3.4 follow-up: harden audit trigger helper API exposure.
-- Trigger remains executable by its owner during DML; API callers cannot invoke it.
begin;
revoke execute on function public.audit_merchant_promotion_change()
  from public, anon, authenticated;
commit;
