export type CommerceEventType =
  | "profile_view"
  | "favorite"
  | "promotion_view"
  | "route_request"
  | "contact_click"
  | "share";

export interface CommerceAnalyticsEvent {
  businessId: string;
  type: CommerceEventType;
  occurredAt: string;
}

export interface CommerceAnalyticsSummary {
  views: number;
  favorites: number;
  promotionViews: number;
  routeRequests: number;
  contactClicks: number;
  shares: number;
}

export function summarizeCommerceEvents(
  events: CommerceAnalyticsEvent[],
  businessId: string
): CommerceAnalyticsSummary {
  const filtered=events.filter((event)=>event.businessId===businessId);
  const count=(type:CommerceEventType)=>filtered.filter((event)=>event.type===type).length;
  return {
    views:count("profile_view"),
    favorites:count("favorite"),
    promotionViews:count("promotion_view"),
    routeRequests:count("route_request"),
    contactClicks:count("contact_click"),
    shares:count("share")
  };
}

export function appendCommerceEvent(
  events: CommerceAnalyticsEvent[],
  event: CommerceAnalyticsEvent,
  maxEvents=500
): CommerceAnalyticsEvent[] {
  return [...events,event].slice(-maxEvents);
}
