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

## Merchant Console
Phase 1 stores a draft in local browser storage so the workflow is functional without unsafe backend writes.

Draft fields:
- business name
- category
- description
- phone
- website
- featured offer
- promotion

Publication remains blocked until merchant-scoped Supabase RLS policies and a dedicated write workflow are implemented.

## Data truth rule
Demo businesses are always labeled synthetic.
No demo location, opening status, product, price or promotion may be represented as an actual Mercado Metropolitano business.
