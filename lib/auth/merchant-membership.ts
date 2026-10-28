export const MERCHANT_ACCESS_ADMIN_ROLES=[
  "platform_owner","municipality_admin","venue_manager"
] as const;

export type MerchantAccessAdminRole=typeof MERCHANT_ACCESS_ADMIN_ROLES[number];

export function mayManageMerchantAccess(
  memberships:readonly {venueId:string;role:string}[],
  venueId:string
):boolean{
  return memberships.some(m=>m.venueId===venueId&&
    (MERCHANT_ACCESS_ADMIN_ROLES as readonly string[]).includes(m.role));
}

export function mayChangeMerchantAccess(
  actorId:string|null,
  targetId:string,
  memberships:readonly {venueId:string;role:string}[],
  venueId:string
):boolean{
  return Boolean(actorId&&targetId&&actorId!==targetId)&&
    mayManageMerchantAccess(memberships,venueId);
}
