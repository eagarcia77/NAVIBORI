# NAVIBORI Merchant Promotions — API and security contract

## Authenticated merchant routes
- `GET /api/merchant/promotions`: list promotions owned by authenticated merchant.
- `POST /api/merchant/promotions`: create promotion.
- `PATCH /api/merchant/promotions/:id`: edit owned promotion.
- `POST /api/merchant/promotions/:id/deactivate`: deactivate owned promotion.

Request payload for create/update:
```json
{
  "title": "Example 10% discount",
  "description": "Illustrative offer only",
  "startsAt": "2026-10-11T00:00:00Z",
  "endsAt": "2026-10-12T00:00:00Z"
}
```
Example content is fictional and must not be published as a real offer.

## Backend obligations
- Authenticate merchant sessions and verify merchant ownership on **every** read/write.
- Never trust merchant ID supplied by the browser as proof of authorization.
- Implement CSRF protection for cookie-authenticated writes, server-side validation, and audit logs.
- Persist offers with server-issued IDs, created/updated timestamps, author ID, active flag, and merchant ID.
- Display only approved, active offers within their time window; deactivate should take effect immediately.
- Define timezone display in Puerto Rico (America/Puerto_Rico) while storing UTC timestamps.
- Rate-limit writes and prevent misleading, abusive or expired promotions.
- Expose active offers to proximity service with merchant coordinates; do not disclose customer location to merchants.
- Require separate, revocable opt-in for promotional alerts.
- Implement actual merchant dashboard, backend and QA before claiming this works in production.

## Deployment status
These are frontend API client modules only; the production backend is not yet implemented or verified.
