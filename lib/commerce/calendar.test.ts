import { describe, expect, it } from "vitest";
import { buildRequestCalendarIcs } from "./calendar";

describe("request calendar ICS",()=>{
  it("contains schedule and reference without customer PII",()=>{
    const ics=buildRequestCalendarIcs({
      requestId:"12345678-abcd-4ef0-9000-123456789abc",
      businessName:"Comercio Demo",
      fulfillmentMethod:"pickup",
      startsAt:"2026-10-09T18:00:00Z",
      slotMinutes:30
    });

    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("Comercio Demo");
    expect(ics).toContain("Ref. 12345678");
    expect(ics).toContain("DTSTART:20261009T180000Z");
    expect(ics).toContain("DTEND:20261009T183000Z");
    expect(ics).not.toContain("customer");
    expect(ics).not.toContain("phone");
    expect(ics).not.toContain("email");
  });
});
