import { describe, expect, it } from "vitest";
import { composePublicCommerce } from "./public-transform";

describe("public commerce composition",()=>{
  it("maps active database rows to CommerceProfile",()=>{
    const profiles=composePublicCommerce(
      [{
        id:"b1",
        venue_id:"v1",
        space_id:"s1",
        name:"Comercio Uno",
        slug:"comercio-uno",
        status:"active",
        description:"Demo real",
        phone:"7875550000",
        whatsapp:"+17875550000",
        website:null,
        metadata:{},
        created_by:"u1",
        category:"gastronomia",
        verification_status:"verified",
        ownership_verified:true,
        location_verified:true,
        review_notes:null,
        reviewed_at:"2026-10-07T00:00:00Z",
        reviewed_by:"reviewer-1",
        created_at:"2026-10-07T00:00:00Z",
        updated_at:"2026-10-07T00:00:00Z"
      }],
      [{
        id:"h1",
        business_id:"b1",
        day_of_week:1,
        opens:"09:00:00",
        closes:"17:00:00",
        closed:false,
        created_at:"2026-10-07T00:00:00Z",
        updated_at:"2026-10-07T00:00:00Z"
      }],
      [{
        id:"o1",
        business_id:"b1",
        title:"Oferta",
        description:null,
        price:10,
        currency:"USD",
        featured:true,
        available:true,
        sku:null,
        sort_order:0,
        created_at:"2026-10-07T00:00:00Z",
        updated_at:"2026-10-07T00:00:00Z"
      }],
      [],
      [{
        id:"m1",
        business_id:"b1",
        kind:"logo",
        storage_path:"b1/logo/logo.webp",
        alt_text:"Logo del comercio",
        sort_order:0,
        created_by:"u1",
        created_at:"2026-10-07T00:00:00Z",
        updated_at:"2026-10-07T00:00:00Z",
        public_url:"https://signed.example/logo.webp"
      }]
    );

    expect(profiles[0].demo).toBe(false);
    expect(profiles[0].verifiedLocation).toBe(true);
    expect(profiles[0].hours[0].day).toBe("mon");
    expect(profiles[0].offers[0].available).toBe(true);
    expect(profiles[0].logo?.altText).toBe("Logo del comercio");
  });
});
