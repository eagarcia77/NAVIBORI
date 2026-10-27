-- Preserve independent review without granting reviewers edit access to merchant content.
create policy enrollment_internal_only on navibori_private.merchant_enrollments
  for all to authenticated using(false) with check(false);

drop policy "owners can manage business hours" on public.business_hours;
create policy "owners can manage business hours" on public.business_hours for all to authenticated
using(exists(select 1 from public.businesses b where b.id=business_hours.business_id and b.created_by=(select auth.uid())
  and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending')
  and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
with check(exists(select 1 from public.businesses b where b.id=business_hours.business_id and b.created_by=(select auth.uid())
  and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending')
  and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])));
create policy "reviewers can inspect business hours" on public.business_hours for select to authenticated
using(exists(select 1 from public.businesses b where b.id=business_hours.business_id and
  navibori_private.has_venue_role(b.venue_id,array['platform_owner','municipality_admin','venue_manager'])));
create policy "owners can read business hours" on public.business_hours for select to authenticated
using(exists(select 1 from public.businesses b where b.id=business_hours.business_id and b.created_by=(select auth.uid())));

drop policy "owners can manage business offers" on public.business_offers;
create policy "owners can manage business offers" on public.business_offers for all to authenticated
using(exists(select 1 from public.businesses b where b.id=business_offers.business_id and b.created_by=(select auth.uid())
  and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending')
  and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
with check(exists(select 1 from public.businesses b where b.id=business_offers.business_id and b.created_by=(select auth.uid())
  and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending')
  and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])));
create policy "reviewers can inspect business offers" on public.business_offers for select to authenticated
using(exists(select 1 from public.businesses b where b.id=business_offers.business_id and
  navibori_private.has_venue_role(b.venue_id,array['platform_owner','municipality_admin','venue_manager'])));
create policy "owners can read business offers" on public.business_offers for select to authenticated
using(exists(select 1 from public.businesses b where b.id=business_offers.business_id and b.created_by=(select auth.uid())));

drop policy "merchants can delete own business drafts" on public.businesses;
create policy "merchants can delete own business drafts" on public.businesses for delete to authenticated
using(created_by=(select auth.uid()) and status='draft' and verification_status<>'pending'
  and navibori_private.has_venue_role(venue_id,array['merchant','platform_owner','municipality_admin','venue_manager']));
