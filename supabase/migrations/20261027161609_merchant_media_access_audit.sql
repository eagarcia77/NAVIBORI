-- Apply membership revocation and pending-review freeze to advertisement images.
alter policy "owners can insert business media" on public.business_media to authenticated
with check(created_by=(select auth.uid()) and exists(select 1 from public.businesses b where b.id=business_media.business_id and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
;
alter policy "owners can update business media" on public.business_media to authenticated
using(created_by=(select auth.uid()) and exists(select 1 from public.businesses b where b.id=business_media.business_id and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
with check(created_by=(select auth.uid()) and exists(select 1 from public.businesses b where b.id=business_media.business_id and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
;
alter policy "owners can delete business media" on public.business_media to authenticated
using(created_by=(select auth.uid()) and exists(select 1 from public.businesses b where b.id=business_media.business_id and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
;
alter policy "owners can upload business media objects" on storage.objects to authenticated
with check(bucket_id='business-media' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(objects.name))[1] and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
;
alter policy "owners can update business media objects" on storage.objects to authenticated
using(bucket_id='business-media' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(objects.name))[1] and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
with check(bucket_id='business-media' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(objects.name))[1] and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
;
alter policy "owners can delete business media objects" on storage.objects to authenticated
using(bucket_id='business-media' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(objects.name))[1] and b.created_by=(select auth.uid()) and b.status in ('draft','active') and (b.status='active' or b.verification_status<>'pending') and navibori_private.has_venue_role(b.venue_id,array['merchant','platform_owner','municipality_admin','venue_manager'])))
;
