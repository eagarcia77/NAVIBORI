import {describe,it,expect} from "vitest";
import {mayChangeMerchantAccess,mayManageMerchantAccess} from "./merchant-membership";
const memberships=[{venueId:"venue-1",role:"venue_manager"}];
describe("merchant venue permission boundaries",()=>{
  it("allows existing venue admins only within their assigned venue",()=>{
    expect(mayManageMerchantAccess(memberships,"venue-1")).toBe(true);
    expect(mayManageMerchantAccess(memberships,"venue-2")).toBe(false);
    expect(mayManageMerchantAccess([{venueId:"venue-1",role:"merchant"}],"venue-1")).toBe(false);
    expect(mayManageMerchantAccess([{venueId:"venue-1",role:"analytics_viewer"}],"venue-1")).toBe(false);
    expect(mayManageMerchantAccess([],"venue-1")).toBe(false);
  });
  it("never permits self-grant or self-revocation",()=>{
    expect(mayChangeMerchantAccess("admin","admin",memberships,"venue-1")).toBe(false);
    expect(mayChangeMerchantAccess("admin","merchant",memberships,"venue-1")).toBe(true);
    expect(mayChangeMerchantAccess(null,"merchant",memberships,"venue-1")).toBe(false);
  });
  it("cannot administer a venue with role granted elsewhere",()=>{
    expect(mayChangeMerchantAccess("admin","merchant",memberships,"venue-2")).toBe(false);
  });
});
