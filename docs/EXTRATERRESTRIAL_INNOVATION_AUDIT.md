# NAVIBORI — Extraterrestrial Innovation Audit v1.0

## Executive conclusion

NAVIBORI already has the correct terrestrial foundation: canonical spatial data, revision governance, role-based publication, routing primitives, MapLibre, Three.js, WebXR capability detection, Supabase/PostGIS and a multi-venue model.

The next leap is not "more map features." It is to turn NAVIBORI into a **Spatial Intelligence Operating System for Puerto Rico**.

The product should evolve through five layers:

1. **SEE** — understand the physical environment.
2. **THINK** — reason over place, time, accessibility and intent.
3. **PREDICT** — simulate likely conditions and journeys.
4. **PROJECT** — render guidance through map, AR, VR and digital twin.
5. **REMEMBER** — preserve validated spatial knowledge and operational history.

## Innovation doctrine

Every experimental feature must:
- degrade gracefully;
- never fabricate official spatial or emergency data;
- require explicit permission for sensors or precise location;
- use the canonical published spatial dataset;
- keep anonymous navigation possible;
- remain accessible without AR/VR;
- be isolated behind capability detection and feature flags.

## NOVA engines

### 1. Spatial Memory Graph
A temporal knowledge graph connecting Venue → Space → POI → Event → Asset → Revision → Observation.

Purpose:
- answer "what changed here?";
- replay venue evolution;
- explain why a route changed;
- allow AI to reason from validated provenance.

Status: BUILDABLE NOW at schema/API level.

### 2. Temporal Twin / Time Machine
The digital twin becomes time-aware.

Modes:
- Now
- Earlier today
- Yesterday
- Event mode
- Future planned state

Use cases:
- operational replay;
- event setup previews;
- before/after comparisons;
- route closure history.

Status: BUILDABLE NOW once timestamped spatial snapshots are available.

### 3. Ghost Trails
Privacy-preserving aggregate movement traces rendered as fading flows instead of tracking individuals.

Use cases:
- congestion visualization;
- discoverability analysis;
- accessibility bottleneck detection;
- venue planning.

Rule: aggregate only; no raw visitor trail exposed to venue staff.

Status: BUILDABLE with privacy thresholds.

### 4. Predictive Flow Field
Simulate likely movement and congestion from:
- published route graph;
- venue capacity;
- event schedule;
- historical aggregate counts.

Output is clearly labeled predictive, never factual.

Status: PHASE 2.

### 5. Holo-Coquí
The NAVIBORI guide becomes a spatial agent rather than a chat bubble.

Capabilities:
- points to POIs;
- speaks route instructions;
- appears in AR when supported;
- falls back to 2D avatar and audio/text;
- can trigger map actions.

Status: BUILDABLE progressively.

### 6. Portal Mode
Visitors can open a spatial portal from a location card into a remote venue or scene.

Implementation path:
- 360/equirectangular scene first;
- Three.js/WebXR portal effect;
- future volumetric scene when source capture exists.

Status: BUILDABLE NOW with non-volumetric scenes.

### 7. Semantic Twin
Every spatial object has machine-readable meaning, not just geometry.

Examples:
- "food vendor"
- "wheelchair-accessible entrance"
- "temporary event stage"
- "quiet zone"
- "charging point"
- "historical artifact"

The AI guide can reason over these semantics while geometry remains canonical.

Status: BUILDABLE NOW.

### 8. Adaptive Accessibility Engine
Routes adapt to voluntary user preferences:
- step-free;
- low sensory load;
- fewer sharp turns;
- shorter distance;
- seating/rest stops;
- larger visual instructions;
- reduced motion.

Never infer disability. Preferences are user-selected.

Status: BUILDABLE once validated accessibility attributes exist.

### 9. Spatial Quest Engine
Gamified venue discovery:
- cultural quests;
- municipal trails;
- event scavenger hunts;
- educational missions;
- collectible digital stamps.

No location history is required beyond current-session progress.

Status: BUILDABLE NOW.

### 10. Puerto Rico Spatial Passport
A cross-venue visitor passport:
- voluntary;
- privacy-preserving;
- stamps from markets, museums, plazas and festivals;
- rewards and cultural learning.

Status: BUILDABLE NOW.

### 11. Mixed-Reality Event Layer
Events can publish temporary spatial overlays:
- stages;
- vendor booths;
- queue zones;
- AR art;
- temporary routes.

All temporary geometry must have start/end validity.

Status: BUILDABLE NOW at schema level.

### 12. Spatial Presence
Opt-in shared session where a group can see:
- shared destination;
- route progress;
- meeting point;
- remote participant avatar/pointer.

No always-on family/location tracking.

Status: PHASE 2.

### 13. WebGPU Spatial Compute
Use WebGPU when available for:
- large point clouds;
- particle/flow fields;
- occlusion experiments;
- heavy twin rendering;
- route heat simulations.

Fallback: WebGL/CPU.

Status: EXPERIMENTAL because WebGPU is not universally available.

### 14. Depth-Aware AR
Where supported, use WebXR depth sensing + hit testing + anchors to improve:
- placement;
- occlusion;
- floor/wall awareness;
- persistent local anchors.

Fallback: QR/manual anchor positioning.

Status: EXPERIMENTAL and device-dependent.

### 15. Spatial Audio Wayfinding
3D audio cues can augment visual instructions:
- destination direction;
- proximity feedback;
- accessible nonvisual navigation support.

Must include volume/mute controls and non-audio alternatives.

Status: BUILDABLE NOW in browser; requires UX validation.

### 16. Digital Scent / Haptics abstraction
NAVIBORI should expose a future sensory action interface without assuming current consumer hardware.

Possible channels:
- vibration patterns;
- headset haptics;
- future venue IoT/scent devices.

Status: RESEARCH. Do not make product claims yet.

### 17. Venue Autopilot
Operational assistant suggests—not executes automatically:
- likely congestion response;
- temporary signage;
- staffing attention;
- route messaging;
- promotion timing.

Human approval required before public operational changes.

Status: PHASE 3.

### 18. Puerto Rico Spatial Graph
Federate all participating venues into one discoverable graph:
Municipality → Venue → Experience → Route → Event → Culture → Commerce.

A user could ask:
"I have four hours in the south. Build me an accessible cultural route with lunch."

Status: PLATFORM NORTH STAR.

## Priority matrix

### P0 — implement architecture now
- NOVA Lab capability detection
- Semantic Twin metadata contract
- temporal revision/query model
- feature flags
- sensor permission ledger
- experimental-mode labeling
- shared published dataset adapter

### P1 — after official pilot data
- adaptive routing
- Holo-Coquí
- Spatial Quest
- Portal Mode
- temporal Twin
- event overlays
- spatial audio

### P2 — after telemetry volume exists
- Ghost Trails
- predictive flow
- digital operations replay
- crowd-aware itinerary suggestions

### Research track
- volumetric capture / Gaussian splatting
- persistent world anchors
- WebGPU compute simulation
- advanced haptics
- external visual positioning systems
- wearable integrations

## Safety boundary

SafeRoute and emergency evacuation remain outside generative experimentation. They require official plans, approved procedures and domain validation.

## Product north star

**NAVIBORI should not become another map. It should become Puerto Rico's spatial intelligence layer: a living, explainable, accessible digital twin of participating physical places.**
