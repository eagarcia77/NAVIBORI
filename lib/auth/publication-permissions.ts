export type VenueRole =
  | "platform_owner"
  | "municipality_admin"
  | "venue_manager"
  | "merchant"
  | "event_manager"
  | "content_editor"
  | "analytics_viewer"
  | "visitor";

export type PublicationAction =
  | "create_draft"
  | "submit_review"
  | "approve"
  | "publish"
  | "view_audit";

const permissions: Record<PublicationAction, VenueRole[]> = {
  create_draft: ["platform_owner", "municipality_admin", "venue_manager", "content_editor"],
  submit_review: ["platform_owner", "municipality_admin", "venue_manager", "content_editor"],
  approve: ["platform_owner", "municipality_admin", "venue_manager"],
  publish: ["platform_owner", "municipality_admin", "venue_manager"],
  view_audit: ["platform_owner", "municipality_admin", "venue_manager", "analytics_viewer"]
};

export function canPerformPublicationAction(
  role: VenueRole,
  action: PublicationAction
): boolean {
  return permissions[action].includes(role);
}

export function satisfiesSeparationOfDuties(
  authorUserId: string,
  reviewerUserId: string,
  publisherUserId: string
): boolean {
  return Boolean(authorUserId)
    && Boolean(reviewerUserId)
    && Boolean(publisherUserId)
    && authorUserId !== reviewerUserId
    && reviewerUserId !== publisherUserId;
}
