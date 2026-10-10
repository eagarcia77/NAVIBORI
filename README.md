# NAVIBORI XR

**Puerto Rico Spatial Experience Platform**

NAVIBORI XR is a multi-venue spatial intelligence platform for Puerto Rico. It combines interactive mapping, wayfinding, accessibility, events, commerce, digital twins, AR, VR, spatial AI, temporal state and experimental cross-reality experiences.

## Pilot 001
**Mercado Metropolitano de Juana Díaz, Puerto Rico**

Pilot 001 remains in `draft` until authoritative spatial geometry and indoor data are validated.

## Product modules
- NAVIBORI Maps — 2D / Globe spatial exploration
- NAVIBORI Wayfinding — graph routing and accessible-route profiles
- NAVIBORI AR — augmented-reality navigation research
- NAVIBORI VR — immersive exploration
- NAVIBORI Twin — browser-first digital twin
- NAVIBORI AI — spatial concierge / typed command architecture
- NAVIBORI Pulse — privacy-aware analytics
- NAVIBORI Studio — spatial CMS and publication workflow
- NAVIBORI NOVA — spatial-intelligence experimentation
- NAVIBORI XENO — frontier spatial-computing research

## Technology foundation
- Next.js 16
- React 19
- TypeScript
- MapLibre GL JS
- OpenFreeMap basemap
- PostgreSQL + PostGIS
- Supabase Auth / RLS / RPC / generated types
- Three.js
- WebXR capability detection
- WebGPU / WebNN capability detection
- Render deployment
- PWA-first architecture
- GitHub Actions security/type/test/build gates

## Spatial truth principle
A single canonical published spatial model powers the map, routing, Twin, AR, VR and AI-facing experiences.

Experimental renderers, predictions or neural output never replace authoritative geometry, accessibility data or emergency procedures.

## Development
```bash
npm ci
npm run dev
```

## Ownership
Created and owned by **Dr. Eduardo Augusto García Rodríguez**  
Founder / Product Architect

See [docs/OWNERSHIP.md](docs/OWNERSHIP.md).

## Status
Active platform foundation on branch `foundation/navibori-v0.1`.

> NAVIBORI XR is a working product name pending formal trademark clearance.
