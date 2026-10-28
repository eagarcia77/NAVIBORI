import type { Database } from "@/lib/supabase/database.types";

export type DailyMetricRow=
  Database["public"]["Tables"]["business_daily_metrics"]["Row"];

export interface MerchantMetricSummary {
  profileViews:number;
  favorites:number;
  promotionViews:number;
  routeRequests:number;
  contactClicks:number;
  shares:number;
  engagement:number;
}

export function summarizeDailyMetrics(
  rows:DailyMetricRow[]
):MerchantMetricSummary{
  const sum=(key:keyof Omit<DailyMetricRow,"business_id"|"metric_date"|"updated_at">)=>
    rows.reduce((total,row)=>total+Number(row[key] ?? 0),0);

  const profileViews=sum("profile_views");
  const favorites=sum("favorites");
  const promotionViews=sum("promotion_views");
  const routeRequests=sum("route_requests");
  const contactClicks=sum("contact_clicks");
  const shares=sum("shares");

  return {
    profileViews,
    favorites,
    promotionViews,
    routeRequests,
    contactClicks,
    shares,
    engagement:favorites+promotionViews+routeRequests+contactClicks+shares
  };
}
