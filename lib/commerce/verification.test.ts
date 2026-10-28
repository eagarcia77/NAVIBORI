import { describe, expect, it } from "vitest";
import { assessMerchantVerification } from "./verification";

describe("Merchant Verification",()=>{
  it("can be ready for review before official location and ownership verification",()=>{
    const state=assessMerchantVerification({
      name:true,
      description:true,
      contact:true,
      hours:true,
      catalog:true,
      locationVerified:false,
      ownerMembershipVerified:false
    });
    expect(state.readyForReview).toBe(true);
    expect(state.verified).toBe(false);
  });

  it("requires all checks for verified state",()=>{
    const state=assessMerchantVerification({
      name:true,
      description:true,
      contact:true,
      hours:true,
      catalog:true,
      locationVerified:true,
      ownerMembershipVerified:true
    });
    expect(state.verified).toBe(true);
  });
});
