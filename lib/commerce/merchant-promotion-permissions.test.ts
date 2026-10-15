import {describe,expect,it} from "vitest";
import {canManageMerchantPromotion,type MerchantPromotionBusinessContext} from "./merchant-promotion-permissions";

const business:MerchantPromotionBusinessContext={
  businessId:"business-1",createdBy:"owner-1",venueId:"venue-1",
  status:"active",verificationStatus:"verified"
};
const merchant=[{venueId:"venue-1",role:"merchant" as const}];

describe("merchant promotion permissions",()=>{
  it("grants active owner with same-venue merchant membership",()=>{
    for(const action of ["view","create","edit","activate","pause"] as const)
      expect(canManageMerchantPromotion("owner-1",merchant,business,action)).toBe(true);
  });
  it("denies foreign business and cross-venue role",()=>{
    expect(canManageMerchantPromotion("foreign",merchant,business,"edit")).toBe(false);
    expect(canManageMerchantPromotion("owner-1",[{venueId:"venue-2",role:"merchant"}],business,"edit")).toBe(false);
    expect(canManageMerchantPromotion("owner-1",[{venueId:"venue-1",role:"visitor"}],business,"edit")).toBe(false);
  });
  it("denies previously authorized owners after role revocation",()=>{
    expect(canManageMerchantPromotion("owner-1",[],business,"pause")).toBe(false);
  });
  it("allows drafts but not activation, and freezes pending/disabled businesses",()=>{
    expect(canManageMerchantPromotion("owner-1",merchant,{...business,status:"draft",verificationStatus:"unverified"},"create")).toBe(true);
    expect(canManageMerchantPromotion("owner-1",merchant,{...business,status:"draft"},"activate")).toBe(false);
    expect(canManageMerchantPromotion("owner-1",merchant,{...business,status:"draft",verificationStatus:"pending"},"edit")).toBe(false);
    expect(canManageMerchantPromotion("owner-1",merchant,{...business,status:"suspended"},"edit")).toBe(false);
  });
});
