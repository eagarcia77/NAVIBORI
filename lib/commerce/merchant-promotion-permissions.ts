export type MerchantVenueRole=
  |"merchant"|"platform_owner"|"municipality_admin"|"venue_manager"
  |"event_manager"|"content_editor"|"analytics_viewer"|"visitor";
export type MerchantPromotionOperation="view"|"create"|"edit"|"activate"|"pause";

export interface MerchantPromotionBusinessContext{
  businessId:string;
  createdBy:string;
  venueId:string;
  status:string;
  verificationStatus:string;
}

/** UX guard mirrors server RLS. The database is the ultimate authority.
 * Administrative role does not grant cross-merchant promotion editing here.
 */
export function canManageMerchantPromotion(
  userId:string|null,
  memberships:readonly {venueId:string;role:MerchantVenueRole}[],
  business:MerchantPromotionBusinessContext,
  operation:MerchantPromotionOperation
):boolean{
  if(!userId||business.createdBy!==userId||
     !["draft","active"].includes(business.status))return false;
  const member=memberships.some(m=>
    m.venueId===business.venueId&&
    ["merchant","platform_owner","municipality_admin","venue_manager"].includes(m.role)
  );
  if(!member)return false;
  if(business.status==="draft"&&business.verificationStatus==="pending")return false;
  if(operation==="activate"){
    return business.status==="active"&&business.verificationStatus==="verified";
  }
  return true;
}
