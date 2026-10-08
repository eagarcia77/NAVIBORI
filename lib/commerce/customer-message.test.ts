import { describe, expect, it } from "vitest";
import {
  buildCustomerContactHref,
  buildCustomerStatusMessage
} from "./customer-message";

describe("customer status message",()=>{
  it("builds a ready pickup update",()=>{
    const message=buildCustomerStatusMessage({
      businessName:"Comercio Demo",
      reference:"12345678-abcd",
      status:"ready",
      fulfillmentMethod:"pickup",
      requestedFor:"2026-10-09T18:00:00Z",
      estimatedReadyAt:null,
      timeZone:"America/Puerto_Rico"
    });

    expect(message).toContain("Comercio Demo · NAVIBORI");
    expect(message).toContain("Ref. 12345678");
    expect(message).toContain("lista para recoger");
  });

  it("prefills whatsapp without exposing extra data",()=>{
    const href=buildCustomerContactHref(
      "whatsapp",
      "+1 (787) 555-0101",
      "Mensaje de prueba"
    );

    expect(href).toContain("https://wa.me/17875550101");
    expect(href).toContain("Mensaje%20de%20prueba");
  });
});
