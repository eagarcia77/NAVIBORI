# NAVIBORI — Brand & Commerce Specification

Status: implementation specification; not a live checkout.

## Brand source of truth
- Reuse the existing official NAVIBORI logo, color tokens, typography, and brand assets from the deployed application once their source paths are verified.
- Do not substitute generic compass imagery or invent an official logo.
- Brand tokens should be centralized, with documented light/dark variants and accessible contrast.
- Suggested campaign tagline (pending approval): "Explora. Descubre. Conecta."

## UX constraints
- Navigation starts in a full-screen map.
- Commerce lives in a separate Store route accessible from the menu, never as a blocking navigation overlay.
- GPS, routing, transport modes, and turn-by-turn controls must not depend on store availability.
- Device language selects Spanish or English; allow a manual override.

## Initial merchandising catalog (proposed prices, USD)
| SKU | Product | Price |
|---|---|---:|
| NB-CAP-001 | Gorra NAVIBORI | 24.99 |
| NB-TEE-001 | T-shirt Essential | 29.99 |
| NB-BOT-001 | Termo Explorer | 22.99 |
| NB-BAG-001 | Tote Bag Urban | 19.99 |
| NB-HOD-001 | Hoodie Premium | 49.99 |
| NB-STK-001 | Sticker Pack | 5.99 |
| NB-KEY-001 | Llavero | 9.99 |
| NB-PR-TEE-001 | Camiseta Puerto Rico | 34.99 |

Prices are placeholders, not offers; confirm suppliers, taxes, shipping, margins, and inventory before launch.

## Product data contract
id, sku, localized_name, localized_description, category, currency, unit_price, images, image_alt, variants(size,color), inventory_quantity, fulfillment_method, status(draft|active|archived), updated_at.

## Checkout security
- Server-side price and stock validation.
- Hosted payment checkout, webhook signature validation, idempotent order processing.
- Never collect/store raw card numbers in NAVIBORI.
- Orders, refunds, shipping, and taxes require backend integration and operational policy.

## Merchant marketplace phase 2
Merchant onboarding, product moderation, seller authorization, commissions, settlement and disputes, and commercial notification opt-in.

## Launch gates
1. Confirm canonical app code and brand assets.
2. Implement isolated Store page and admin catalog.
3. Test mobile UX and verify no map overlays during active navigation.
4. Connect test-mode payments and shipping calculations.
5. Verify tax, privacy, accessibility, bilingual content, and refund policy.
6. Only then publish live merchandise.
