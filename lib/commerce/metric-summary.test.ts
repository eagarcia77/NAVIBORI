import { describe, expect, it } from "vitest";
import { summarizeDailyMetrics } from "./metric-summary";

describe("merchant metric summary",()=>{
  it("sums daily counters",()=>{
    const rows=[
      {
        business_id:"b1",
        metric_date:"2026-10-07",
        profile_views:4,
        favorites:1,
        promotion_views:2,
        route_requests:1,
        contact_clicks:3,
        shares:1,
        updated_at:"2026-10-07T00:00:00Z"
      },
      {
        business_id:"b1",
        metric_date:"2026-10-08",
        profile_views:6,
        favorites:2,
        promotion_views:1,
        route_requests:2,
        contact_clicks:1,
        shares:0,
        updated_at:"2026-10-08T00:00:00Z"
      }
    ];

    const summary=summarizeDailyMetrics(rows);
    expect(summary.profileViews).toBe(10);
    expect(summary.contactClicks).toBe(4);
    expect(summary.engagement).toBe(14);
  });
});
