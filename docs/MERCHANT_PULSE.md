# Merchant Pulse

Merchant Pulse is the privacy-preserving commerce analytics layer for NAVIBORI.

## Phase 1 — local demo
Events are stored only in the current browser and demonstrate:
- profile views
- favorites
- promotion views
- route requests
- contact clicks
- shares

No visitor identity is collected.

## Production direction
Aggregate server-side metrics by venue/business/date after:
- merchant RLS exists;
- privacy thresholds are defined;
- retention is defined;
- raw visitor identifiers are excluded.

## QR/deep link
Each business has a canonical NAVIBORI deep link. Phase 1 exposes the canonical payload without calling an external QR generation service.

A visual QR renderer should be local/client-side or self-hosted so visitor navigation does not leak to a third-party QR service.
