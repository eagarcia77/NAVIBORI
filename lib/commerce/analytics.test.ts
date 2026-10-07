import { describe, expect, it } from "vitest";
import { appendCommerceEvent, summarizeCommerceEvents } from "./analytics";

describe("Commerce analytics",()=>{
  it("summarizes events by business",()=>{
    const events=[
      {businessId:"a",type:"profile_view" as const,occurredAt:"2026-10-01T00:00:00Z"},
      {businessId:"a",type:"favorite" as const,occurredAt:"2026-10-01T00:01:00Z"},
      {businessId:"b",type:"profile_view" as const,occurredAt:"2026-10-01T00:02:00Z"}
    ];
    const summary=summarizeCommerceEvents(events,"a");
    expect(summary.views).toBe(1);
    expect(summary.favorites).toBe(1);
  });

  it("caps retained local events",()=>{
    const current=[
      {businessId:"a",type:"profile_view" as const,occurredAt:"1"},
      {businessId:"a",type:"profile_view" as const,occurredAt:"2"}
    ];
    expect(appendCommerceEvent(current,{businessId:"a",type:"share",occurredAt:"3"},2)).toHaveLength(2);
  });
});
