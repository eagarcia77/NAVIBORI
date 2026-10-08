# NAVIBORI Commerce Foundation

## Primary visitor experience
- discover businesses
- search by name, tag or featured offer
- filter by category
- view active promotions
- save favorites locally
- inspect featured products/services
- view contact actions when real data exists
- request route only when location/routing are verified
- submit general, pickup or reservation requests when the merchant enables them
- choose only published fulfillment slots with remaining capacity
- respect merchant blackout periods before a request is created

## Merchant Console
The Merchant Console supports a local draft for resilience plus merchant-scoped Supabase synchronization under RLS for authorized accounts.

Operational capabilities:
- business profile and verification workflow
- visual identity/media
- public QR/deep-link kit
- weekly hours
- catalog/products/services
- promotions
- request/pickup/reservation configuration
- per-slot pickup and reservation capacity
- merchant-defined fulfillment blackout periods
- realtime customer request inbox
- request acceptance/completion/cancellation
- quick customer contact
- CSV request export
- historical business analytics
- 7-day capacity dashboard with saturation alerts
- daily fulfillment operations board with date navigation, slot utilization, scheduled-request actions and no-show handling
- operational fulfillment progression: accepted → preparing → ready → completed
- merchant ETA controls for accepted/preparing requests
- secure customer self-service status tracking with 15-second refresh

Public activation remains review-controlled by the venue workflow. Merchant content does not bypass verification/publication rules.

## Fulfillment truth rule
Customer-facing slot availability and the merchant daily operations board use the same Supabase fulfillment RPC/capacity model. NAVIBORI does not maintain a second client-only inventory of capacity.

A submitted request still requires merchant confirmation. Requests in new, accepted, preparing and ready states continue consuming slot capacity until they are completed, cancelled or marked no-show. Customer status links expose only operational status/timing data after token verification; they do not expose stored contact details or private notes. NAVIBORI does not currently process payment.

## Data truth rule
Demo businesses are always labeled synthetic.
No demo location, opening status, product, price or promotion may be represented as an actual Mercado Metropolitano business.
