# NAVIBORI XR — Immersive Architecture

## Principle
AR, VR, 3D and the 2D map must consume the same canonical spatial model. No XR experience should maintain a separate authoritative copy of venue geometry or POI data.

## Layers
1. **Spatial truth** — validated building/floor/space geometry, POI and route graph.
2. **Presentation** — 2D map and 3D scene.
3. **Anchoring** — QR first; NFC/BLE and other positioning methods may be added after field validation.
4. **Experience** — AR wayfinding, AR discovery, VR exploration, guided journeys.
5. **Intelligence** — AI may recommend destinations and journeys, but it must not invent spatial facts.

## AR MVP
- Scan a validated QR anchor.
- Resolve anchor → venue/floor/node.
- Select destination.
- Compute route from graph.
- Render direction cues derived from route segments.
- Always provide a non-AR map alternative.

## AR production safeguards
- Never represent unverified device pose as precise indoor position.
- Show confidence/positioning state.
- Re-anchor when confidence degrades.
- Do not use generative AI to determine emergency exits or accessible paths.
- Respect reduced-motion preferences.

## VR MVP
- Browser-first 3D exploration.
- Optional headset support through WebXR when supported.
- POI details pulled from canonical records.
- Same event and merchant content as 2D map.
- Provide keyboard/mouse/touch alternatives.

## Digital Twin
The Digital Twin is a structured spatial representation, not merely a 3D model.

Minimum entity chain:
Venue → Building → Floor → Space → POI → Asset

The twin should support:
- geometry versioning;
- data provenance;
- publication status;
- validity dates;
- accessibility annotations;
- operational state.

## Mascot / AI guide
The coquí guide can:
- explain controls;
- surface POI;
- build itineraries;
- narrate cultural content;
- appear as an optional AR/VR guide.

The guide must never block essential navigation and must have a dismissible/non-character interface equivalent.
